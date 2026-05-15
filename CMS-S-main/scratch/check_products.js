
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: 'Nước ép', mode: 'insensitive' } },
        { name: { contains: 'Cà phê', mode: 'insensitive' } },
        { category: { contains: 'Nước ép', mode: 'insensitive' } },
        { category: { contains: 'Cà phê', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      name: true,
      category: true,
      recipe: true
    }
  });

  console.log(JSON.stringify(products, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
