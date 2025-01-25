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
          try {
            // Parse the multipart form data
            const formData = await req.formData();
            const file = formData.get('image'); // 'image' is the field name from the frontend
    
            if (!file || !(file instanceof Blob)) {
              return new Response(JSON.stringify({ success: false, error: "No file uploaded" }), {
                status: 400,
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              });
            }
    
            // Convert the file to a Buffer
            const fileBuffer = await file.arrayBuffer();


            
    
            // Process the image (example: extract colors)
            const colorsExtractor = new ColorExtractor();
            await colorsExtractor.loadImage(Buffer.from(fileBuffer));
            const colors = await colorsExtractor.extractColors();
    
            console.log("Colors:", colors);
    
            // Return the response
            return new Response(JSON.stringify({ success: true, colors }), {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            });
          } catch (error) {
            console.error("Error processing file:", error);
            return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }
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