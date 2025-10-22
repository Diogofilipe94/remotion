// Teste específico para geração de vídeo
const testVideoGeneration = async () => {
  try {
    console.log('🎬 A testar geração de vídeo...\n');
    
    const videoData = {
      title: "Vídeo de Teste",
      subtitle: "Gerado em Portugal",
      backgroundColor: "#1a1a2e",
      textColor: "#ffffff",
      duration: 3
    };
    
    console.log('📤 Dados do vídeo:', videoData);
    console.log('⏳ A enviar pedido...');
    
    const response = await fetch('http://localhost:3000/api/generate-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(videoData)
    });
    
    console.log('📡 Status da resposta:', response.status);
    
    const data = await response.json();
    console.log('📋 Resposta completa:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n🎉 SUCESSO! Vídeo gerado!');
      console.log(`📹 ID: ${data.videoId}`);
      console.log(`⏱️ Duração: ${data.duration}s`);
      console.log(`🔗 URL: http://localhost:3000${data.downloadUrl}`);
      console.log('\n💡 Podes transferir o vídeo ou abrir no browser!');
    } else {
      console.log('\n❌ Erro na geração:');
      console.log(data.error);
      
      // Analisar o tipo de erro
      if (data.error.includes('studio')) {
        console.log('\n🔧 Sugestão: Problema com configuração do Remotion Studio');
      } else if (data.error.includes('Module not found')) {
        console.log('\n🔧 Sugestão: Módulo não encontrado - problema de dependências');
      } else {
        console.log('\n🔧 Sugestão: Erro geral de configuração');
      }
    }
    
  } catch (error) {
    console.log('❌ Erro de conexão:', error.message);
    console.log('💡 Certifica-te de que o servidor está a correr');
  }
};

testVideoGeneration();
