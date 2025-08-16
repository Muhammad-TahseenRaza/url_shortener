import { readFile, writeFile } from 'fs/promises';
import { createServer } from 'http';
import crypto from 'crypto';
import path from 'path';


let DATA_FILE = path.join('data', 'links.json');


//* serve File to browser

async function serveFile(res, filePath, contentType) {
    try {
        let data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        return res.end(data);
    } catch (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 page not found');
    }
}


//* load Links

async function loadLinks() {
    try {
        const data = await readFile(DATA_FILE, 'utf-8');
        
        return  JSON.parse(data);

    } catch (error) {
        if (error.code === 'ENOENT') {
            await writeFile(DATA_FILE, JSON.stringify({}));
            return {};

        }
        throw error;
    }
}


//* save Links

async function saveLinks(links) {
    await writeFile(DATA_FILE, JSON.stringify(links));
}


//* create server

let server = createServer(async (req, res) => {


    // get file and show at browser

    if (req.method === 'GET') {
        if (req.url === '/') {
            return serveFile(res, path.join('public', '01.url-shortener.html'), 'text/html');

        } else if (req.url === '/01.style.css') {
            return serveFile(res, path.join('public', '01.style.css'), 'text/css');

        } else if (req.url === '/links') {
            const links = await loadLinks();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(links));

        } else {
            const links = await loadLinks();
            const shortCode = req.url.slice(1);
            if (links[shortCode]) {
                res.writeHead(302, { location: links[shortCode] });
                return res.end();
            }

            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('Shortened URL is not found');
        }
    }


    // data come from frontend in json

    if (req.method === 'POST' && req.url === '/shorten') {


        // load links

        const links = await loadLinks();


        let body = '';

        req.on('data', (chunk) => {
            body += chunk;
        })
        req.on('end', async () => {
            try {
                // console.log(body);
                const { url, shortCode } = JSON.parse(body);


                // check that the url is empty or not 

                if (!url) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    return res.end('url is required');
                }

                const finalShortCode = shortCode || crypto.randomBytes(4).toString('hex');

                // check links

                if (links[finalShortCode]) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    return res.end('Short code already exists. Please choose another.');

                }

                links[finalShortCode] = url;

                await saveLinks(links);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, shortCode: finalShortCode }));
                
            }catch (err) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Invalid JSON format');
            }

        })
    }

})


server.listen(3000, () => {
    console.log(`listening at http://localhost:${3000}`);
})