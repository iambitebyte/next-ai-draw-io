import { execFile } from "child_process"
import { randomUUID } from "crypto"
import { unlink, writeFile } from "fs/promises"
import { join } from "path"
import { promisify } from "util"
import { z } from "zod"

const execFileAsync = promisify(execFile)

const CONVERT_TIMEOUT_MS = 30_000

const requestSchema = z.object({
    xml: z.string().min(1),
    filename: z.string().min(1).max(255),
})

export async function POST(req: Request) {
    let data
    try {
        data = requestSchema.parse(await req.json())
    } catch {
        return Response.json(
            { success: false, error: "Invalid input" },
            { status: 400 },
        )
    }

    const id = randomUUID()
    const inputPath = join("/tmp", `${id}.drawio`)
    const outputPath = join("/tmp", `${id}.vsdx`)

    try {
        await writeFile(inputPath, data.xml, "utf-8")

        await execFileAsync(
            "xvfb-run",
            ["-a", "drawio", "-x", "-f", "vsdx", "-o", outputPath, inputPath],
            { timeout: CONVERT_TIMEOUT_MS },
        )

        const { readFile } = await import("fs/promises")
        const vsdxBuffer = await readFile(outputPath)

        const filename = data.filename.replace(/\.vsdx$/i, "")

        return new Response(vsdxBuffer, {
            headers: {
                "Content-Type": "application/vnd.ms-visio.drawing.main+xml",
                "Content-Disposition": `attachment; filename="${filename}.vsdx"`,
            },
        })
    } catch (error) {
        console.error("VSDX conversion failed:", error)
        const message =
            error instanceof Error ? error.message : "Conversion failed"
        return Response.json(
            { success: false, error: message },
            { status: 500 },
        )
    } finally {
        // Clean up temp files regardless of success or failure
        for (const p of [inputPath, outputPath]) {
            try {
                await unlink(p)
            } catch {
                // File may not exist, ignore
            }
        }
    }
}
