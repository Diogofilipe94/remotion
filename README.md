# 🎬 Remotion Docker API

Uma API completa para gerar vídeos com o uso do Remotion dentro de um container Docker, seguindo as [melhores práticas oficiais](https://www.remotion.dev/docs/docker).

## 🚀 Funcionalidades

- ✅ Geração de vídeos via API REST
- ✅ Upload de imagens para vídeos personalizados
- ✅ Download de vídeos gerados
- ✅ Listagem e gerenciamento de vídeos
- ✅ Containerização completa com Docker
- ✅ Interface web para testes
- ✅ Suporte a múltiplos cores (otimizado para Linux)

## 📋 Pré-requisitos

- Docker e Docker Compose instalados
- Node.js 18+ (para desenvolvimento local)
- Pelo menos 4GB de RAM disponível para o container

## 🛠️ Instalação e Uso

### 1. Clone e Configure

```bash
git clone <seu-repositorio>
cd remotion-docker-api
```

### 2. Build e Execução com Docker Compose

```bash
# Build e iniciar o container
docker-compose up --build

# Executar em background
docker-compose up -d --build
```

### 3. Testar a API

Aceda a `http://localhost:3000` para ver a documentação da API ou abra `client-example.html` no navegador para testar a interface.

## 🔧 Endpoints da API

### POST `/api/generate-video`
Gera um vídeo simples com texto personalizado.

**Body:**
```json
{
  "title": "Meu Vídeo",
  "subtitle": "Subtítulo",
  "backgroundColor": "#000000",
  "textColor": "#ffffff",
  "duration": 5
}
```

**Resposta:**
```json
{
  "success": true,
  "videoId": "uuid-do-video",
  "downloadUrl": "/api/download/uuid-do-video",
  "duration": 5.0,
  "message": "Vídeo gerado com sucesso!"
}
```

### POST `/api/generate-video-with-image`
Gera vídeo com upload de imagem.

**Form Data:**
- `image`: arquivo de imagem
- `title`, `subtitle`, `backgroundColor`, `textColor`, `duration`: campos de texto

### GET `/api/download/:videoId`
Download do vídeo gerado.

### GET `/api/videos`
Lista todos os vídeos gerados.

### DELETE `/api/videos/:videoId`
Apaga um vídeo específico.

### GET `/api/health`
Health check da API.

## 🐳 Configuração do Docker

### Dockerfile
O Dockerfile segue as [recomendações oficiais do Remotion](https://www.remotion.dev/docs/docker):

- Base: `node:22-bookworm-slim`
- Instalação das dependências do Chrome
- Suporte a emojis e caracteres CJK
- Otimizações para múltiplos cores

### Docker Compose
Configurações incluídas:
- Limite de recursos (4 CPUs, 4GB RAM)
- Volumes para persistência de dados
- Health check automático
- Restart automático

## 🎨 Personalização

### Modificar Componentes de Vídeo
Edite `src/VideoRoot.tsx` para criar seus próprios componentes:

```tsx
export const VideoRoot = ({ title, subtitle, backgroundColor, textColor }) => {
  // Seu código personalizado aqui
};
```

### Adicionar Novos Endpoints
Modifique `src/server.js` para adicionar novos endpoints ou funcionalidades.

## 📊 Performance

### Otimizações Incluídas
- `enableMultiProcessOnLinux: true` para melhor performance
- Configuração de recursos no Docker Compose
- Uso de volumes para persistência
- Health checks para monitoramento

### Recomendações
- Use pelo menos 4 CPUs para renderização
- Reserve 2GB+ de RAM para o container
- Para produção, considere usar `--cpus` e `--cpuset-cpus` flags

## 🔍 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Build do projeto
npm run build
```

## 📁 Estrutura do Projeto

```
├── src/
│   ├── server.js          # Servidor Express
│   ├── renderer.js        # Lógica de renderização
│   ├── VideoRoot.tsx      # Componente principal do vídeo
│   └── index.ts           # Entrada do Remotion
├── Dockerfile             # Configuração do container
├── docker-compose.yml     # Orquestração dos serviços
├── render.mjs            # Script de renderização standalone
├── remotion.config.ts    # Configuração do Remotion
├── package.json          # Dependências do projeto
└── client-example.html   # Interface de teste
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **Erro de memória**: Aumente o limite de RAM no docker-compose.yml
2. **Renderização lenta**: Verifique se `enableMultiProcessOnLinux` está habilitado
3. **Chrome não encontrado**: Execute `npx remotion browser ensure` no container

### Logs do Container

```bash
# Ver logs em tempo real
docker-compose logs -f

# Ver logs específicos
docker-compose logs remotion-api
```

## 🔗 Integração com Seu Website

### Exemplo JavaScript

```javascript
async function generateVideo(videoData) {
  const response = await fetch('http://localhost:3000/api/generate-video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(videoData)
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Vídeo gerado com sucesso
    window.open(result.downloadUrl, '_blank');
  }
}
```

### Exemplo PHP

```php
<?php
$videoData = [
    'title' => 'Meu Vídeo',
    'subtitle' => 'Gerado via API',
    'backgroundColor' => '#000000',
    'textColor' => '#ffffff',
    'duration' => 5
];

$response = file_get_contents('http://localhost:3000/api/generate-video', false, 
    stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($videoData)
        ]
    ])
);

$result = json_decode($response, true);
?>
```

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou problemas:
- Consulte a [documentação oficial do Remotion](https://www.remotion.dev/docs)
- Abra uma issue no repositório
- Entre em contato através do Discord do Remotion
