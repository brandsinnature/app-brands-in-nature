import { spawn } from 'child_process';
import { NextResponse } from 'next/server';

export async function POST(req: Request): Promise<NextResponse> {
  try {
    if (!req.body) {
      return NextResponse.json(
        { success: false, error: 'Request body is null' },
        { status: 400 }
      );
    }

    const body = await req.json();
    if (body.frame.length < 20) {
      return NextResponse.json(
        { success: false, error: 'Invalid frame data' },
        { status: 200 }
      );
    }

    const pythonProcess = spawn('python', ['scanner.py']);
    pythonProcess.stdin.write(body.frame);
    pythonProcess.stdin.end();

    let stdoutData = '';
    let stderrData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    const response = await new Promise<NextResponse>((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (stderrData || code !== 0) {
          console.error('Scanner script error:', stderrData);
          resolve(NextResponse.json(
            { success: false, error: 'Scanner script execution failed' },
            { status: 500 }
          ));
        } else {
          try {
            const scanResult = JSON.parse(stdoutData);
            resolve(NextResponse.json(scanResult, { status: 200 }));
          } catch (parseError) {
            console.error('Parsing error:', parseError);
            resolve(NextResponse.json(
              { success: false, error: 'Invalid JSON from scanner script' },
              { status: 500 }
            ));
          }
        }
      });

      pythonProcess.on('error', (error) => {
        reject(error);
      });
    });

    return response;

  } catch (error) {
    console.error('Scanning error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}