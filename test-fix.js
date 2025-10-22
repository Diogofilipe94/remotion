// Teste simples da geração de vídeo após correção
const testVideoGeneration = async () => {
  try {
    console.log('🔍 A testar a geração de vídeo após correção...\n');
    
    const videoData = {
      title: "Teste de Correção",
      subtitle: "Sem erro de studio",
      backgroundColor: "#1a1a2e",
      textColor: "#ffffff",
      duration: 3
    };
    
    console.log('📤 A enviar dados:', videoData);
    
    const response = await fetch('http://localhost:3000/api/generate-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(videoData)
    });
    
    const data = await response.json();
    console.log('✅ Resposta:', data);
    
    if (data.success) {
      console.log('');
      console.log('🎉 SUCESSO! O erro do studio foi corrigido!');
      console.log(`📹 Vídeo ID: ${data.videoId}`);
      console.log(`⏱️ Duração: ${data.duration}s`);
    } else {
      console.log('❌ Ainda há erro:', data.error);
    }
    
  } catch (error) {
    console.log('❌ Erro de conexão:', error.message);
  }
};

testVideoGeneration();
