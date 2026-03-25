const EMU_TO_GRID_X = 80 / 12192000;
const EMU_TO_GRID_Y = 45 / 6858000;

export async function parsePptx(file) {
    const { default: JSZip } = await import('https://esm.sh/jszip');
    const zip = new JSZip();
    await zip.loadAsync(file);

    const slides = [];
    
    // Find all slides XML
    const slideRegex = /^ppt\/slides\/slide(\d+)\.xml$/;
    const slideFiles = Object.keys(zip.files).filter(f => slideRegex.test(f));
    
    // Sort logically
    slideFiles.sort((a,b) => {
        const numA = parseInt(a.match(slideRegex)[1], 10);
        const numB = parseInt(b.match(slideRegex)[1], 10);
        return numA - numB;
    });

    for (const slideFile of slideFiles) {
        const slideXmlStr = await zip.file(slideFile).async("text");
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(slideXmlStr, "text/xml");
        
        const shapes = [];
        const spNodes = xmlDoc.getElementsByTagName("p:sp");
        
        for (let i = 0; i < spNodes.length; i++) {
            const sp = spNodes[i];
            
            // Get position
            const xfrm = sp.getElementsByTagName("a:xfrm")[0];
            if (!xfrm) continue;
            
            const off = xfrm.getElementsByTagName("a:off")[0];
            const ext = xfrm.getElementsByTagName("a:ext")[0];
            
            if (!off || !ext) continue;
            
            const xEmu = parseInt(off.getAttribute("x") || 0, 10);
            const yEmu = parseInt(off.getAttribute("y") || 0, 10);
            const cxEmu = parseInt(ext.getAttribute("cx") || 0, 10);
            const cyEmu = parseInt(ext.getAttribute("cy") || 0, 10);
            
            // Get text (rough extraction)
            let text = "";
            const tNodes = sp.getElementsByTagName("a:t");
            for (let j = 0; j < tNodes.length; j++) {
                text += tNodes[j].textContent + " ";
            }
            text = text.trim();
            
            // Try to infer type
            let type = "content";
            const nvSpPr = sp.getElementsByTagName("p:nvSpPr")[0];
            if (nvSpPr) {
                const ph = nvSpPr.getElementsByTagName("p:ph")[0];
                if (ph) {
                    const phType = ph.getAttribute("type");
                    if (phType === "title" || phType === "ctrTitle") {
                        type = "title";
                    } else if (phType === "subTitle") {
                        type = "subtitle";
                    }
                }
            }

            shapes.push({
                x: xEmu, y: yEmu, w: cxEmu, h: cyEmu,
                text,
                type
            });
        }
        
        slides.push({
            title: `Extracted Slide ${slides.length + 1}`,
            shapes
        });
    }

    return mapPptxToGrid({ slides });
}

export function mapPptxToGrid(pptxData) {
  return pptxData.slides.map(slide => {
    return {
      name: slide.title || "Imported Slide",
      regions: slide.shapes.map(shape => ({
        id: Math.random().toString(36).substr(2, 9),
        name: shape.type === 'title' ? 'Title' : 'Content',
        x: Math.min(80, Math.max(0, Math.floor(shape.x * EMU_TO_GRID_X))),
        y: Math.min(45, Math.max(0, Math.floor(shape.y * EMU_TO_GRID_Y))),
        w: Math.max(4, Math.floor(shape.w * EMU_TO_GRID_X)),
        h: Math.max(2, Math.floor(shape.h * EMU_TO_GRID_Y)),
        content: shape.text || "",
        role: shape.type === 'title' ? 'primary-title' : 'supporting-text',
        llmHint: 'Extracted from presentation'
      }))
    };
  });
}
