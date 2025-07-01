from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import httpx
import asyncio
import tempfile
from supabase import create_client, Client
import logging
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Import your analysis modules
from integrated_analyzer import SongAnalyzer
from demographics_model_adapted import DemographicsPredictor
from platform_model_adapted import PlatformPredictor
from similar_artists_adapted import SimilarArtistsFinder

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Song Nerd API", version="1.0.0")

# CORS middleware - Update with your Vercel URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://personal-projects-pwq0gwrcz-caras-projects-afd78f2d.vercel.app",  # Replace with your actual Vercel URL
        "http://localhost:3000",  # For local development
        "https://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

supabase: Client = create_client(supabase_url, supabase_key)

# Initialize analysis models (lazy loading for better startup time)
analyzer = None
demographics_predictor = None
platform_predictor = None
similar_artists_finder = None

def get_analyzer():
    global analyzer
    if analyzer is None:
        analyzer = SongAnalyzer()
    return analyzer

def get_demographics_predictor():
    global demographics_predictor
    if demographics_predictor is None:
        demographics_predictor = DemographicsPredictor()
    return demographics_predictor

def get_platform_predictor():
    global platform_predictor
    if platform_predictor is None:
        platform_predictor = PlatformPredictor()
    return platform_predictor

def get_similar_artists_finder():
    global similar_artists_finder
    if similar_artists_finder is None:
        similar_artists_finder = SimilarArtistsFinder()
    return similar_artists_finder

class SongAnalysisRequest(BaseModel):
    song_id: str
    file_url: str
    metadata: dict

class DirectUploadRequest(BaseModel):
    song_id: str
    metadata: dict

@app.get("/")
async def root():
    return {
        "message": "Song Nerd API is running!",
        "version": "1.0.0",
        "status": "healthy",
        "endpoints": [
            "/api/songs/analyze",
            "/api/songs/upload",
            "/health"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "song-nerd-api"}

@app.post("/api/songs/analyze")
async def analyze_song_endpoint(request: SongAnalysisRequest, background_tasks: BackgroundTasks):
    """Trigger AI analysis for a song from URL"""
    try:
        logger.info(f"Starting analysis for song {request.song_id}")
        
        # Update song status to processing
        supabase.table("songs").update({
            "processing_status": "processing"
        }).eq("id", request.song_id).execute()
        
        # Add analysis to background task
        background_tasks.add_task(
            process_song_analysis, 
            request.song_id, 
            request.file_url, 
            request.metadata
        )
        
        return {
            "message": "Analysis started",
            "song_id": request.song_id,
            "status": "processing"
        }
    except Exception as e:
        logger.error(f"Error starting analysis: {e}")
        await update_song_status(request.song_id, "failed", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/songs/upload")
async def upload_and_analyze(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    song_id: str = None,
    metadata: str = "{}"
):
    """Upload audio file directly and analyze"""
    try:
        import json
        metadata_dict = json.loads(metadata) if metadata else {}
        
        if not song_id:
            raise HTTPException(status_code=400, detail="song_id is required")
        
        logger.info(f"Starting upload analysis for song {song_id}")
        
        # Update song status to processing
        await update_song_status(song_id, "processing")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Add analysis to background task
        background_tasks.add_task(
            process_uploaded_file_analysis,
            song_id,
            temp_file_path,
            metadata_dict
        )
        
        return {
            "message": "File uploaded and analysis started",
            "song_id": song_id,
            "status": "processing"
        }
        
    except Exception as e:
        logger.error(f"Error in upload endpoint: {e}")
        if song_id:
            await update_song_status(song_id, "failed", str(e))
        raise HTTPException(status_code=500, detail=str(e))

async def update_song_status(song_id: str, status: str, error_message: str = None):
    """Update song processing status in database"""
    try:
        update_data = {"processing_status": status}
        if error_message:
            update_data["error_message"] = error_message
        
        supabase.table("songs").update(update_data).eq("id", song_id).execute()
    except Exception as e:
        logger.error(f"Failed to update song status: {e}")

async def download_audio_file(file_url: str) -> str:
    """Download audio file from URL to temporary file"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(file_url)
            response.raise_for_status()
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
                temp_file.write(response.content)
                return temp_file.name
                
    except Exception as e:
        logger.error(f"Failed to download audio file: {e}")
        raise

async def process_song_analysis(song_id: str, file_url: str, metadata: dict):
    """Background task to process song analysis from URL"""
    temp_file_path = None
    try:
        logger.info(f"Processing analysis for song {song_id}")
        
        # Download the audio file
        temp_file_path = await download_audio_file(file_url)
        
        # Process the analysis
        await run_analysis(song_id, temp_file_path, metadata)
        
    except Exception as e:
        logger.error(f"Analysis failed for song {song_id}: {e}")
        await update_song_status(song_id, "failed", str(e))
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

async def process_uploaded_file_analysis(song_id: str, temp_file_path: str, metadata: dict):
    """Background task to process uploaded file analysis"""
    try:
        logger.info(f"Processing uploaded file analysis for song {song_id}")
        await run_analysis(song_id, temp_file_path, metadata)
        
    except Exception as e:
        logger.error(f"Analysis failed for song {song_id}: {e}")
        await update_song_status(song_id, "failed", str(e))
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

async def run_analysis(song_id: str, audio_file_path: str, metadata: dict):
    """Run the actual AI analysis on the audio file"""
    try:
        # Get analysis models
        analyzer = get_analyzer()
        demographics_predictor = get_demographics_predictor()
        platform_predictor = get_platform_predictor()
        similar_artists_finder = get_similar_artists_finder()
        
        # Run integrated analysis
        analysis_results = analyzer.analyze_song(audio_file_path)
        
        # Get demographics prediction
        demographics_results = demographics_predictor.predict_demographics(analysis_results)
        
        # Get platform predictions
        platform_results = platform_predictor.predict_platforms(analysis_results)
        
        # Get similar artists
        similar_artists_results = similar_artists_finder.find_similar_artists(
            analysis_results, 
            metadata.get("genre", "unknown")
        )
        
        # Combine all results
        combined_analysis = {
            **analysis_results,
            "processing_time": analysis_results.get("processing_time", 0),
            "model_version": "1.0"
        }
        
        combined_insights = {
            "primary_age_group": demographics_results.get("primary_age_group", "Unknown"),
            "age_confidence": demographics_results.get("confidence", 0.0),
            "primary_region": demographics_results.get("primary_region", "Unknown"),
            "region_confidence": demographics_results.get("region_confidence", 0.0),
            "top_platform": platform_results.get("top_platform", "spotify"),
            "platform_scores": platform_results.get("platform_scores", {}),
            "similar_artists": similar_artists_results.get("similar_artists", []),
            "action_items": generate_action_items(demographics_results, platform_results),
            "sound_profile": analysis_results.get("sound_profile", "Unknown"),
            "competitive_advantage": generate_competitive_advantage(analysis_results),
            "overall_confidence": calculate_overall_confidence(demographics_results, platform_results),
            "model_version": "1.0"
        }
        
        # Insert analysis results
        supabase.table("analysis").insert({
            "song_id": song_id,
            **combined_analysis
        }).execute()
        
        supabase.table("marketing_insights").insert({
            "song_id": song_id,
            **combined_insights
        }).execute()
        
        # Update song status to completed
        await update_song_status(song_id, "completed")
        
        logger.info(f"Analysis completed for song {song_id}")
        
    except Exception as e:
        logger.error(f"Analysis processing failed for song {song_id}: {e}")
        raise

def generate_action_items(demographics_results: dict, platform_results: dict) -> list:
    """Generate actionable marketing recommendations"""
    action_items = []
    
    primary_age = demographics_results.get("primary_age_group")
    if primary_age:
        action_items.append(f"Focus marketing on {primary_age} age group")
    
    top_platform = platform_results.get("top_platform")
    if top_platform:
        action_items.append(f"Prioritize {top_platform} playlist submissions")
    
    platform_scores = platform_results.get("platform_scores", {})
    if "tiktok" in platform_scores and platform_scores["tiktok"] > 70:
        action_items.append("Create TikTok-friendly content")
    
    if "instagram" in platform_scores and platform_scores["instagram"] > 70:
        action_items.append("Develop Instagram story campaigns")
    
    return action_items

def generate_competitive_advantage(analysis_results: dict) -> str:
    """Generate competitive advantage description"""
    danceability = analysis_results.get("danceability", 0)
    energy = analysis_results.get("energy", 0)
    valence = analysis_results.get("valence", 0)
    
    if danceability > 0.7 and valence > 0.6:
        return "High danceability with positive emotional appeal"
    elif energy > 0.8:
        return "High energy track with strong engagement potential"
    elif valence < 0.4:
        return "Emotional depth with authentic storytelling"
    else:
        return "Balanced musical elements with broad appeal"

def calculate_overall_confidence(demographics_results: dict, platform_results: dict) -> float:
    """Calculate overall confidence score"""
    age_confidence = demographics_results.get("confidence", 0.0)
    region_confidence = demographics_results.get("region_confidence", 0.0)
    
    # Simple average for now - could be more sophisticated
    return (age_confidence + region_confidence) / 2

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)