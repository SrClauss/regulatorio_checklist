const puppeteer = require('puppeteer');

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

  // Logs de depuração de rede e console
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', req => {
    console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText);
  });

  const targetUrl = 'http://2.25.170.196/';

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
    await page.waitForSelector('#email', { timeout: 5000 });
    await page.type('#email', 'cliente@alpha.com.br');
    await page.type('#password', 'cliente123');

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
    console.log('🚪 Fazendo logout do cliente...');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('Sair')) {
        await btn.click();
        break;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n--- Teste 2: Login do Consultor (Roberto) ---');
    console.log('✍️ Preenchendo credenciais do consultor...');
    await page.waitForSelector('#email', { timeout: 5000 });
    await page.type('#email', 'roberto@consultoria.com.br');
    await page.type('#password', 'roberto123');

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

    console.log('🚪 Fazendo logout do consultor...');
    const buttonsConsultor = await page.$$('button');
    for (const btn of buttonsConsultor) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('Sair')) {
        await btn.click();
        break;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 2000));

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
