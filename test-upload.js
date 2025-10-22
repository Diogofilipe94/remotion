// Teste da funcionalidade de upload de vídeos
const testUploadAPI = async () => {
  try {
    console.log('🔍 A testar a funcionalidade de upload de vídeos...\n');
    
    // Teste 1: Listar vídeos carregados (deve estar vazio inicialmente)
    console.log('1️⃣ A testar listagem de vídeos carregados...');
    const uploadedResponse = await fetch('http://localhost:3000/api/uploaded-videos');
    const uploadedData = await uploadedResponse.json();
    console.log('✅ Lista de vídeos carregados:', uploadedData);
    console.log('');
    
    // Teste 2: Verificar endpoints disponíveis
    console.log('2️⃣ A verificar endpoints disponíveis...');
    const rootResponse = await fetch('http://localhost:3000/');
    const rootData = await rootResponse.json();
    console.log('✅ Endpoints disponíveis:', rootData.endpoints);
    console.log('');
    
    console.log('🎯 A funcionalidade de upload está disponível!');
    console.log('💡 Para testar o upload:');
    console.log('   1. Abre client-example.html no browser');
    console.log('   2. Vai ao separador "📤 Carregar Vídeo"');
    console.log('   3. Selecciona um ficheiro de vídeo');
    console.log('   4. Clica em "📤 Carregar Vídeo"');
    console.log('');
    console.log('📋 Endpoints de upload disponíveis:');
    console.log('   - POST /api/upload-video (carregar vídeo)');
    console.log('   - GET /api/uploaded-videos (listar vídeos carregados)');
    console.log('   - DELETE /api/uploaded-videos/:videoId (eliminar vídeo)');
    
  } catch (error) {
    console.log('❌ Erro ao testar a API de upload:', error.message);
    console.log('💡 Certifica-te de que o servidor está a correr com: npm start');
  }
};

testUploadAPI();
