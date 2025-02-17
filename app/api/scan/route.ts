import { spawn } from 'child_process';

export async function POST(req: Request): Promise<Response> {  // ✅ Explicitly Promise<Response>
  try {
    if (!req.body) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Request body is null'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();

    if (body.frame.length < 20) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid frame data'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Spawn the Python process
    const pythonProcess = spawn('python', ['scanner.py']);

    pythonProcess.stdin.write(body.frame);
    pythonProcess.stdin.end();

    // Capture Python script output
    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    // ✅ Ensure `Promise<Response>` is returned properly
    return new Promise((resolve) => {
      pythonProcess.on('close', (code) => {
        if (stderrData || code !== 0) {
          console.error('Scanner script error:', stderrData);
          resolve(new Response(JSON.stringify({
            success: false,
            error: 'Scanner script execution failed'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }));
        } else {
          try {
            const scanResult = JSON.parse(stdoutData); // Parse Python output
            resolve(new Response(JSON.stringify(scanResult), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }));
          } catch (parseError) {
            console.error('Parsing error:', parseError);
            resolve(new Response(JSON.stringify({
              success: false,
              error: 'Invalid JSON from scanner script'
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }));
          }
        }
      });
    });

  } catch (error) {
    console.error('Scanning error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
