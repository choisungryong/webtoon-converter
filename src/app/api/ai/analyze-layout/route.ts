import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import type { PanelLayout, LayoutAnalysisResponse } from '../../../../types/layout';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        const { env } = getRequestContext();
        const apiKey = env?.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('[Layout API] No Gemini API Key');
            return NextResponse.json({
                success: false,
                error: 'API key not configured'
            }, { status: 500 });
        }

        const body = await request.json() as { images: string[] };
        const { images } = body;

        if (!images || images.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No images provided'
            }, { status: 400 });
        }

        // Build prompt for layout analysis
        const analysisPrompt = `You are a professional webtoon layout designer. Analyze these ${images.length} webtoon panel images and determine the optimal layout for each.

For EACH image (index 0 to ${images.length - 1}), respond with:
1. Panel Type: 
   - "full-width": For impactful scenes, landscapes, climax moments
   - "half": For standard dialogue scenes, balanced compositions
   - "third": For quick sequences, reaction shots
   - "inset-over-prev": For close-ups that should overlay the previous panel

2. Gutter Size (space after this panel):
   - "none": For continuous action, overlapping panels
   - "small": For fast-paced dialogue
   - "medium": Standard pacing
   - "large": Emotional beats, scene transitions, dramatic pauses

3. Importance Score (0.0-1.0): How visually significant is this panel?

4. Indent (optional):
   - "left": Align panel to left with right margin
   - "right": Align panel to right with left margin
   - "center": Center aligned (default)

Respond ONLY with valid JSON array, no markdown:
[{"index":0,"type":"...","gutter":"...","importance":0.0,"indent":"center"},...]`;

        // Prepare image parts for Gemini
        const imageParts = images.map(img => {
            const match = img.match(/^data:image\/(\w+);base64,(.+)$/);
            if (match) {
                return {
                    inlineData: {
                        mimeType: `image/${match[1]}`,
                        data: match[2]
                    }
                };
            }
            return null;
        }).filter(Boolean);

        if (imageParts.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Invalid image format'
            }, { status: 400 });
        }

        // Call Gemini API for analysis
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const geminiRes = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        ...imageParts,
                        { text: analysisPrompt }
                    ]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.8,
                    maxOutputTokens: 1024
                }
            })
        });

        if (!geminiRes.ok) {
            const errorText = await geminiRes.text();
            console.error('[Layout API] Gemini error:', errorText);

            // Return default layouts on API error
            return NextResponse.json({
                success: true,
                layouts: getDefaultLayouts(images.length),
                fallback: true
            });
        }

        const geminiData = await geminiRes.json();
        const textContent = geminiData?.candidates?.[0]?.content?.parts?.find(
            (p: any) => p.text
        )?.text;

        if (!textContent) {
            console.error('[Layout API] No text response from Gemini');
            return NextResponse.json({
                success: true,
                layouts: getDefaultLayouts(images.length),
                fallback: true
            });
        }

        // Parse JSON response
        try {
            // Clean up response - remove markdown code blocks if present
            let cleanJson = textContent.trim();
            if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.replace(/```json?\n?/g, '').replace(/```/g, '');
            }

            const layouts: PanelLayout[] = JSON.parse(cleanJson);

            // Validate and sanitize
            const validatedLayouts = layouts.map((l, i) => ({
                index: i,
                type: ['full-width', 'half', 'third', 'inset-over-prev'].includes(l.type)
                    ? l.type : 'half',
                gutter: ['none', 'small', 'medium', 'large'].includes(l.gutter)
                    ? l.gutter : 'medium',
                importance: typeof l.importance === 'number'
                    ? Math.max(0, Math.min(1, l.importance)) : 0.5,
                indent: ['left', 'right', 'center'].includes(l.indent || '')
                    ? l.indent : 'center'
            })) as PanelLayout[];

            return NextResponse.json({
                success: true,
                layouts: validatedLayouts
            });

        } catch (parseError) {
            console.error('[Layout API] JSON parse error:', parseError);
            return NextResponse.json({
                success: true,
                layouts: getDefaultLayouts(images.length),
                fallback: true
            });
        }

    } catch (error) {
        console.error('[Layout API] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// Fallback: Generate default layouts
function getDefaultLayouts(count: number): PanelLayout[] {
    return Array.from({ length: count }, (_, i) => ({
        index: i,
        type: i === 0 ? 'full-width' : 'half',
        gutter: 'medium',
        importance: i === 0 ? 0.8 : 0.5,
        indent: 'center'
    }));
}
