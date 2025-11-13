#!/bin/bash
set -e

echo "🚀 Iniciando deploy do frontend Homo..."

FRONT_DIR="/homologacao/frontend"
DEPLOY_DIR="/var/www/html/homologacao"

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
  nvm use 20 >/dev/null 2>&1
fi

echo "📦 Acessando diretório do projeto..."
cd "$FRONT_DIR"

echo "🔄 Atualizando repositório..."
git reset --hard
git pull origin main || git pull origin master

echo "📥 Instalando dependências (modo compatível)..."
npm install --legacy-peer-deps

echo "🏗️ Gerando build de produção..."
npm run build

echo "📂 Limpando diretório de destino..."
rm -rf "$DEPLOY_DIR"/*
mkdir -p "$DEPLOY_DIR"

echo "📦 Copiando build para o diretório de deploy..."
cp -r dist/* "$DEPLOY_DIR"/

echo "✅ Deploy concluído com sucesso!"
echo "🌐 O site deve estar acessível em: https://homo.srv762140.hstgr.cloud"

# Pergunta se deseja atualizar a produção
read -p $'\nDeseja atualizar a PRODUÇÃO copiando o build para /var/www/html? (s/n): ' resposta
if [[ "$resposta" =~ ^[sS]$ ]]; then
  echo "\n🚚 Atualizando produção..."
  sudo rm -rf /var/www/html/*
  sudo cp -r dist/* /var/www/html/
  echo "✅ Produção atualizada!"
  echo "🌐 O site de produção está em: https://srv762140.hstgr.cloud"
else
  echo "⚠️  Produção NÃO foi alterada."
fi

