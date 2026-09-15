const { syncGen1Records } = require('../lib/pokeapi-sync');

syncGen1Records()
  .then((result) => {
    console.log(`Gen 1 sincronizada: ${result.total} registros (${result.created} nuevos, ${result.updated} actualizados)`);
  })
  .catch((error) => {
    console.error('Error al sincronizar Gen 1:', error.message);
    process.exit(1);
  });
