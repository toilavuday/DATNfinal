import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Look for the file in the parent directory of the project root
    const filePath = path.join(process.cwd(), "..", "MaGiamGia_Mau.csv");
    
    if (!fs.existsSync(filePath)) {
      console.error("Voucher CSV not found at:", filePath);
      return new NextResponse("File not found", { status: 404 });
    }

    const csvContent = fs.readFileSync(filePath, "utf-8");
    
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error reading voucher CSV:", error);
    return new NextResponse("Error reading file", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ message: "Voucher code is required" }, { status: 400 });
    }

    // Look for the file in the parent directory of the project root
    const filePath = path.join(process.cwd(), "..", "MaGiamGia_Mau.csv");
    
    if (!fs.existsSync(filePath)) {
      console.error("Voucher CSV not found for update at:", filePath);
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }

    let csvContent = fs.readFileSync(filePath, "utf-8");
    
    // Handle BOM if present
    const hasBOM = csvContent.startsWith("\uFEFF");
    if (hasBOM) {
      csvContent = csvContent.substring(1);
    }

    const lines = csvContent.split(/\r?\n/);
    if (lines.length < 2) {
      return NextResponse.json({ message: "Invalid CSV content" }, { status: 400 });
    }

    const header = lines[0].split(",").map(c => c.trim());
    const codeIdx = header.indexOf("MaGiamGia");
    const qtyIdx = header.indexOf("SoLuong");

    if (codeIdx === -1 || qtyIdx === -1) {
      return NextResponse.json({ message: "CSV structure incorrect" }, { status: 400 });
    }

    let found = false;
    const updatedLines = lines.map((line, index) => {
      if (index === 0 || !line.trim()) return line;
      
      const cols = line.split(",").map(c => c.trim());
      if (cols[codeIdx]?.toUpperCase() === code.toUpperCase()) {
        const currentQty = parseInt(cols[qtyIdx]) || 0;
        if (currentQty > 0) {
          cols[qtyIdx] = (currentQty - 1).toString();
          found = true;
        }
        return cols.join(",");
      }
      return line;
    });

    if (!found) {
      return NextResponse.json({ message: "Voucher not found or out of stock" }, { status: 404 });
    }

    const newContent = (hasBOM ? "\uFEFF" : "") + updatedLines.join("\n");
    fs.writeFileSync(filePath, newContent, "utf-8");

    return NextResponse.json({ message: "Voucher quantity updated successfully" });
  } catch (error) {
    console.error("Error updating voucher CSV:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
