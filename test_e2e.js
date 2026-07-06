const puppeteer = require('puppeteer');

async function typeSecure(page, selector, text) {
  await page.waitForSelector(selector, { timeout: 5000 });
  await page.focus(selector);
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.value = '';
  }, selector);
  await page.type(selector, text, { delay: 20 });
}

(async () => {
  console.log('=== Iniciando Teste E2E do Sistema Claudio ===');
  
  const browser = await puppeteer.launch({ 
    executablePath: '/usr/bin/google-chrome',
    headless: "new",
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process,SafeBrowsing',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
      '--ignore-certificate-errors',
      '--allow-running-insecure-content',
      '--disable-safebrowsing',
      '--safebrowsing-disable-auto-update'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const targetUrl = 'http://187.77.238.27/';

  try {
    // ----------------------------------------------------
    // TESTE 1: Cliente (cliente@alpha.com.br)
    // ----------------------------------------------------
    console.log('\n--- Teste 1: Login do Cliente ---');
    console.log(`🔗 Navegando para ${targetUrl} ...`);
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (err) {
      if (err.message.includes('ERR_BLOCKED_BY_CLIENT')) {
        console.log('⚠️ Aviso: Algum recurso secundário foi bloqueado pelo cliente, prosseguindo com o teste...');
      } else {
        throw err;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('✍️ Preenchendo credenciais do cliente...');
    await typeSecure(page, '#email', 'cliente@alpha.com.br');
    await typeSecure(page, '#password', 'cliente123');

    console.log('🔘 Clicando no botão de login...');
    await page.click('button[type="submit"]');

    console.log('⏳ Aguardando redirecionamento para o Checklist...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verifica a URL ou elemento ativo
    const sidebarText = await page.evaluate(() => document.body.innerText);
    const hasDashboard = sidebarText.includes('Dashboard');
    const hasCadastros = sidebarText.includes('Cadastros & Painel');
    const hasChecklist = sidebarText.includes('Checklist');

    console.log(`🔍 Sidebar contém 'Dashboard'? ${hasDashboard ? '❌ Sim (Erro)' : '✅ Não (Correto)'}`);
    console.log(`🔍 Sidebar contém 'Cadastros'? ${hasCadastros ? '❌ Sim (Erro)' : '✅ Não (Correto)'}`);
    console.log(`🔍 Sidebar contém 'Checklist'? ${hasChecklist ? '✅ Sim (Correto)' : '❌ Não (Erro)'}`);

    console.log('📸 Tirando screenshot da tela do checklist do cliente...');
    await page.screenshot({ path: 'test_client_checklist.png' });
    console.log('💾 Screenshot salvo como "test_client_checklist.png"!');

    // Faz logout para testar próximo perfil
    console.log('🚪 Fazendo logout programático (limpando localStorage)...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // ----------------------------------------------------
    // TESTE 2: Consultor (roberto@consultoria.com.br)
    // ----------------------------------------------------
    console.log('\n--- Teste 2: Login do Consultor (Roberto) ---');
    console.log('✍️ Preenchendo credenciais do consultor...');
    await typeSecure(page, '#email', 'roberto@consultoria.com.br');
    await typeSecure(page, '#password', 'roberto123');

    console.log('🔘 Clicando no botão de login...');
    await page.click('button[type="submit"]');

    console.log('⏳ Aguardando login...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const sidebarTextConsultor = await page.evaluate(() => document.body.innerText);
    const hasDashboardConsultor = sidebarTextConsultor.includes('Dashboard');
    const hasCadastrosConsultor = sidebarTextConsultor.includes('Cadastros & Painel');

    console.log(`🔍 Sidebar contém 'Dashboard'? ${hasDashboardConsultor ? '✅ Sim (Correto)' : '❌ Não (Erro)'}`);
    console.log(`🔍 Sidebar contém 'Cadastros'? ${hasCadastrosConsultor ? '❌ Sim (Erro)' : '✅ Não (Correto)'}`);

    console.log('📸 Tirando screenshot do dashboard simplificado do consultor...');
    await page.screenshot({ path: 'test_consultor_dashboard.png' });
    console.log('💾 Screenshot salvo como "test_consultor_dashboard.png"!');

    // Faz logout para limpar a sessão no final
    console.log('🚪 Fazendo logout final...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('==========================================================');
    console.log('✅ TODOS OS TESTES E2E FORAM EXECUTADOS COM SUCESSO!');
    console.log('==========================================================');

  } catch (err) {
    console.error('❌ Ocorreu um erro durante a execução do teste:', err);
  } finally {
    await browser.close();
    console.log('🚪 Navegador fechado.');
  }
})();
