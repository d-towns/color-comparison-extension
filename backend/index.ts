// the server needs two endpoints
// /upload/ - to upload a file, it bust come with a valid JWT in the Authorization header and a user id in the body ad well as a file 
import { ColorExtractor } from "./color_extractor"
Bun.serve({
    port: 3000,
    
    async fetch(req) {
        const url = new URL(req.url)
        if (req.method === "OPTIONS") {
            return new Response(null, {
              headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
              }
            });
            }
        if(url.pathname === '/upload' && req.method === 'POST') {
            const body = await req.arrayBuffer();

            const colorsExtractor = new ColorExtractor();
            await colorsExtractor.loadImage(Buffer.from(body));
            const colors = await colorsExtractor.extractColors();

            console.log("Colors:", colors);

            return new Response(JSON.stringify({ success: true, colors}), {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                  "Access-Control-Allow-Headers": "Content-Type"
                }
            });
        }
        return new Response('404')
    }

})

console.log('Server running on http://localhost:3000')

// function uploadFile(file: File, userId: string, token: string) {
//     try {
//         validateToken(token)
//         // moderation script
//         // save the file to the file system
//     } catch(e) {
//         return new Response('401')
//     }
// }


// function validateToken(token: string) {
//     return jwt.verify(token, 'secret')
// }