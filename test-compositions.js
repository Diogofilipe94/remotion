// Teste para ver composições disponíveis
const testCompositions = async () => {
  try {
    console.log('🔍 A verificar composições disponíveis...\n');
    
    const { bundle } = await import("@remotion/bundler");
    const { selectComposition } = await import("@remotion/renderer");
    
    const bundleLocation = await bundle({
      entryPoint: "./src/index.ts",
    });
    
    console.log('📦 Bundle criado:', bundleLocation);
    
    // Tentar listar composições
    try {
      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: "VideoRoot",
        inputProps: {},
      });
      console.log('✅ Composição encontrada:', composition);
    } catch (error) {
      console.log('❌ Erro ao encontrar composição:', error.message);
      
      // Tentar com ID diferente
      try {
        const composition = await selectComposition({
          serveUrl: bundleLocation,
          id: "Root",
          inputProps: {},
        });
        console.log('✅ Composição "Root" encontrada:', composition);
      } catch (error2) {
        console.log('❌ Também não encontrou "Root":', error2.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
  }
};

testCompositions();
