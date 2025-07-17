// persistent-chrome-setup.js
const { exec } = require('child_process');
const os = require('os');
const path = require('path');

function setupPersistentChrome() {
    console.log('Setting up persistent Chrome session for Quora scraping...\n');
    
    // Use a persistent directory instead of /tmp
    const userDataDir = path.join(os.homedir(), '.quora-scraper-chrome');
    
    let chromeCommand;
    
    if (os.platform() === 'darwin') { // macOS
        chromeCommand = `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir="${userDataDir}"`;
    } else if (os.platform() === 'win32') { // Windows
        chromeCommand = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="${userDataDir}"`;
    } else { // Linux
        chromeCommand = `google-chrome --remote-debugging-port=9222 --user-data-dir="${userDataDir}"`;
    }
    
    console.log('Chrome profile location:', userDataDir);
    console.log('Starting Chrome...');
    
    exec(chromeCommand, (error) => {
        if (error) {
            console.error('Error starting Chrome:', error.message);
        }
    });
    
    console.log('\nOne-time setup instructions:');
    console.log('1. Chrome is starting with persistent profile');
    console.log('2. Log in to Quora (ONLY NEEDED ONCE)');
    console.log('3. Run: node quora-scraper.js');
    console.log('4. Future runs: just run step 3!');
    
    console.log('\nNext time you can just run:');
    console.log('   node persistent-chrome-setup.js  # (starts Chrome)');
    console.log('   node quora-scraper.js            # (scrapes data)');
}

setupPersistentChrome();