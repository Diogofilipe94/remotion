// Teste simples da API
console.log('🔍 A testar se a API está a funcionar...\n');

// Teste básico de conectividade
fetch('http://localhost:3000/api/health')
  .then(response => response.json())
  .then(data => {
    console.log('✅ API está a responder!');
    console.log('📊 Status:', data.status);
    console.log('⏰ Timestamp:', data.timestamp);
    console.log('🔄 Uptime:', Math.round(data.uptime), 'segundos');
    console.log('');
    console.log('🎯 A API está a funcionar correctamente!');
    console.log('💡 Podes testar no browser:');
    console.log('   - http://localhost:3000 (documentação)');
    console.log('   - client-example.html (interface de teste)');
  })
  .catch(error => {
    console.log('❌ Erro ao conectar à API:', error.message);
    console.log('💡 Certifica-te de que o servidor está a correr com: npm start');
  });
