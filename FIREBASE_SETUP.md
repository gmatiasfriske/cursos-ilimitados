# Configuração do Firebase Realtime Database

Para conectar seu app ao Firebase, siga estes passos:

## 1. Criar Projeto no Firebase
1. Acesse [console.firebase.google.com](https://console.firebase.google.com).
2. Clique em **"Adicionar projeto"**.
3. Dê um nome (ex: `CarlaApp`) e continue.
4. Desative o Google Analytics (opcional) e crie o projeto.

## 2. Criar o Banco de Dados
1. No menu lateral esquerdo, clique em **Build** > **Realtime Database**.
2. Clique em **"Criar banco de dados"**.
3. Escolha o local (United States é padrão e funciona bem).
4. **Importante:** Nas regras de segurança, escolha **"Iniciar no modo de teste"** (isso permite leitura/escrita por 30 dias, ideal para desenvolvimento).

## 3. Importar os Dados Fictícios
1. Após criar o banco, você verá painel com uma URL (ex: `https://seu-projeto.firebaseio.com/`) e um valor `null`.
2. Clique nos **três pontinhos (⋮)** no canto superior direito do painel de dados.
3. Selecione **"Importar JSON"**.
4. Escolha o arquivo `firebase_data.json` que criei na pasta do seu projeto.
5. Clique em **Importar**.

Agora seu banco de dados terá a estrutura correta com um curso de exemplo!

## 4. Conectar no Código (Próximos Passos)
Para o aplicativo ler esses dados, precisaremos instalar o Firebase no projeto:

```bash
npm install firebase
```

E criar um arquivo de configuração com as chaves que você pega em **Configurações do Projeto** (ícone de engrenagem) > **Geral** > **Seus aplicativos** > **App da Web**.

Me avise quando terminar a importação do JSON para eu te ajudar a configurar o código!
