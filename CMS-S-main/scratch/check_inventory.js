
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allEntries = await prisma.stockEntry.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const inventoryMap = new Map();

  for (const entry of allEntries) {
    const cat = entry.category?.trim().toLowerCase() || "";
    const prod = entry.productDetail?.trim().toLowerCase() || "";
    let unt = entry.unit?.trim().toLowerCase() || "";
    if (unt === "pcs") unt = "cái";

    const key = `${cat}-${prod}-${unt}`;
    const existing = inventoryMap.get(key) || {
      category: entry.category?.trim() || "",
      productDetail: entry.productDetail?.trim() || "",
      unit: unt,
      quantity: 0
    };

    if (entry.type === "IMPORT") {
      existing.quantity += entry.quantity;
    } else if (entry.type === "EXPORT" || entry.type === "CONSUME") {
      existing.quantity -= entry.quantity;
    }
    inventoryMap.set(key, existing);
  }

  console.log(JSON.stringify(Array.from(inventoryMap.values()), null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
