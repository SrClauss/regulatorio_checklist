const puppeteer = require('puppeteer');

(async () => {
  console.log('=== Iniciando Teste E2E de Login com Puppeteer ===');
  
  // Inicializa o browser headless
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Configura tamanho da tela para simulação
  await page.setViewport({ width: 1280, height: 800 });

  try {
    const targetUrl = 'http://2.25.170.196/';
    console.log(`🔗 Navegando para ${targetUrl} ...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('✍️ Preenchendo credenciais...');
    await page.type('#email', 'admin@consultoria.com.br');
    await page.type('#password', 'admin123');

    console.log('🔘 Clicando no botão de login...');
    await page.click('button[type="submit"]');

    console.log('⏳ Aguardando requisições de API do Dashboard...');
    // Espera até que a rede fique ociosa e os dados do banco carreguem
    await page.waitForNetworkIdle({ idleTime: 1500 });

    console.log('📸 Tirando screenshot da tela pós-login...');
    await page.screenshot({ path: 'test_login_result.png' });
    console.log('💾 Screenshot salvo como "test_login_result.png"!');

    // Verifica se o token de autenticação foi salvo no localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    if (token) {
      console.log('==========================================================');
      console.log('✅ TESTE E2E BEM-SUCEDIDO!');
      console.log('Token JWT obtido e armazenado no localStorage.');
      console.log('==========================================================');
    } else {
      console.log('==========================================================');
      console.log('❌ FALHA NO TESTE E2E!');
      console.log('O login não pôde ser autenticado ou o token não foi gravado.');
      console.log('==========================================================');
    }

  } catch (err) {
    console.error('❌ Ocorreu um erro durante a execução do teste:', err);
  } finally {
    await browser.close();
    console.log('🚪 Navegador fechado.');
  }
})();
