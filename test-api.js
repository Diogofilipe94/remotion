// Teste da API Remotion
const testAPI = async () => {
  try {
    console.log('🔍 A testar a API Remotion...\n');
    
    // Teste 1: Health Check
    console.log('1️⃣ A testar Health Check...');
    const healthResponse = await fetch('http://localhost:3000/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData);
    console.log('');
    
    // Teste 2: Listar vídeos existentes
    console.log('2️⃣ A testar listagem de vídeos...');
    const videosResponse = await fetch('http://localhost:3000/api/videos');
    const videosData = await videosResponse.json();
    console.log('✅ Lista de vídeos:', videosData);
    console.log('');
    
    // Teste 3: Gerar um vídeo de teste
    console.log('3️⃣ A testar geração de vídeo...');
    const videoData = {
      title: "Vídeo de Teste",
      subtitle: "Criado em Portugal",
      backgroundColor: "#1a1a2e",
      textColor: "#ffffff",
      duration: 3
    };
    
    console.log('📤 A enviar dados:', videoData);
    const generateResponse = await fetch('http://localhost:3000/api/generate-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(videoData)
    });
    
    const generateData = await generateResponse.json();
    console.log('✅ Resposta da geração:', generateData);
    
    if (generateData.success) {
      console.log('');
      console.log('🎉 SUCESSO! A API está a funcionar correctamente!');
      console.log(`📹 Vídeo ID: ${generateData.videoId}`);
      console.log(`⏱️ Duração: ${generateData.duration}s`);
      console.log(`🔗 URL de transferência: http://localhost:3000${generateData.downloadUrl}`);
      console.log('');
      console.log('💡 Podes abrir o ficheiro client-example.html no browser para testar a interface!');
    } else {
      console.log('❌ Erro na geração do vídeo:', generateData.error);
    }
    
  } catch (error) {
    console.log('❌ Erro ao testar a API:', error.message);
    console.log('💡 Certifica-te de que o servidor está a correr com: npm start');
  }
};

testAPI();
