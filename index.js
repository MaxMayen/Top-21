(function(){
    const STORAGE_KEY = 'salon-chain-data-v2';
  
    const svc = (id,name,price,category,variable) => ({ id, name, category, price: variable ? null : price, variable: !!variable });
  
    const defaultCatalog = () => ([
      svc('s01','Corte Dama (CD)',200,'Corte y Peinado',false),
      svc('s02','Corte Caballero (CC)',170,'Corte y Peinado',false),
      svc('s03','Alaciado',null,'Corte y Peinado',true),
      svc('s04','Curly',null,'Corte y Peinado',true),
      svc('s05','Peinado',null,'Corte y Peinado',true),
      svc('s06','Apt',350,'Corte y Peinado',false),
      svc('s07','Tinte',null,'Color y Tratamientos',true),
      svc('s08','Rayos',null,'Color y Tratamientos',true),
      svc('s09','Decoloración',null,'Color y Tratamientos',true),
      svc('s10','Balayage',null,'Color y Tratamientos',true),
      svc('s11','Keratina',null,'Color y Tratamientos',true),
      svc('s12','Bótox',null,'Color y Tratamientos',true),
      svc('s13','Esmalte',100,'Manos y Pies',false),
      svc('s14','Manicure',180,'Manos y Pies',false),
      svc('s15','Pedicure',220,'Manos y Pies',false),
      svc('s16','Gelish',200,'Manos y Pies',false),
      svc('s17','Ap. uñas tips',250,'Manos y Pies',false),
      svc('s18','Ap. uñas esculturales',350,'Manos y Pies',false),
      svc('s19','Ceja',100,'Depilación y Pestañas',false),
      svc('s20','Rostro completo',400,'Depilación y Pestañas',false),
      svc('s21','Axilas',150,'Depilación y Pestañas',false),
      svc('s22','Bikini',350,'Depilación y Pestañas',false),
      svc('s23','Media pierna',250,'Depilación y Pestañas',false),
      svc('s24','Pierna completa',350,'Depilación y Pestañas',false),
      svc('s25','Planchado de ceja',250,'Depilación y Pestañas',false),
      svc('s26','Rizado de pestañas',350,'Depilación y Pestañas',false),
      svc('s27','Pestañas de tira',150,'Depilación y Pestañas',false),
      svc('s28','Pestañas de grupo',300,'Depilación y Pestañas',false),
      svc('s29','Maquillaje',600,'Depilación y Pestañas',false),
    ]);
  
    const TINTE_FRACCIONES = [
      { label: 'Sin tinte', value: 0 },
      { label: '⅛ Tubo ($16)', value: 16 },
      { label: '¼ Tubo ($32)', value: 32 },
      { label: '½ Tubo ($65)', value: 65 },
      { label: '¾ Tubo ($97)', value: 97 },
      { label: '1 Tubo completo ($130)', value: 130 },
    ];
    const DECOLORANTE_PRECIO_GR = 2.5;
  
    const defaultState = () => ({
      chainName: 'Mi Cadena de Estéticas',
      admin: { user: 'admin', pass: '1234', pin: '0000' },
      branches: [
        {
          id: 'b1', name: 'Sucursal Centro', address: 'Av. Principal 123',
          services: defaultCatalog(),
          stylists: [
            { id: 'e1', name: 'Lorena' }, { id: 'e2', name: 'Chelo' },
            { id: 'e3', name: 'Javier' }, { id: 'e4', name: 'Estrella' }
          ],
          sales: []
        },
        {
          id: 'b2', name: 'Sucursal Norte', address: 'Blvd. Norte 456',
          services: [ svc('n1','Corte de cabello',170,'Corte y Peinado',false), svc('n2','Manicure',140,'Manos y Pies',false) ],
          stylists: [ { id: 'e5', name: 'Sofía Méndez' } ],
          sales: []
        }
      ]
    });
  
    let state = null;
    let view = { screen: 'home', branchId: null, adminTab: 'resumen', error: '' };
    let pinModal = null; // { onConfirm(pin) }
  
    const uid = (p) => p + Math.random().toString(36).slice(2, 8);
    const money = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const todayStr = () => new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    const isToday = (iso) => { const d = new Date(iso), t = new Date(); return d.toDateString() === t.toDateString(); };
  
    async function save(){ try{ await window.storage.set(STORAGE_KEY, JSON.stringify(state), false); }catch(e){ console.error('storage set failed', e); } }
    async function load(){
      try{ const r = await window.storage.get(STORAGE_KEY, false); state = r ? JSON.parse(r.value) : defaultState(); }
      catch(e){ state = defaultState(); }
      if (!state.admin.pin) state.admin.pin = '0000';
    }
  
    function branch(){ return state.branches.find(b => b.id === view.branchId); }
    function el(html){ const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
    function root(){ return document.getElementById('esth-app'); }
  
    function computeTotals(b){
      const today = b.sales.filter(s => isToday(s.date));
      const servicios = today.filter(s => s.type === 'servicio');
      const productos = today.filter(s => s.type === 'producto');
      const gastos = today.filter(s => s.type === 'gasto');
      const totalServicios = servicios.reduce((a,s)=>a+s.price,0);
      const totalProductos = productos.reduce((a,s)=>a+s.price,0);
      const totalGastos = gastos.reduce((a,s)=>a+s.amount,0);
      const totalBaucher = servicios.filter(s=>s.method==='Baucher').reduce((a,s)=>a+s.price,0);
      const efectivoServicios = servicios.filter(s=>s.method==='Efectivo').reduce((a,s)=>a+s.price,0);
      const efectivoNeto = efectivoServicios + totalProductos - totalGastos;
      const totalUniversal = totalServicios + totalProductos - totalGastos;
      const porEstilista = {};
      servicios.forEach(s => {
        if (!porEstilista[s.stylistName]) porEstilista[s.stylistName] = { nombre: s.stylistName, servicios: 0, bruto: 0, descuento: 0 };
        const row = porEstilista[s.stylistName];
        row.servicios += 1; row.bruto += s.price; row.descuento += (s.descuentoInsumos||0);
      });
      return { today, servicios, productos, gastos, totalServicios, totalProductos, totalGastos, totalBaucher, efectivoNeto, totalUniversal, porEstilista: Object.values(porEstilista) };
    }
  
    function render(){
      root().innerHTML = '';
      root().appendChild(screens[view.screen]());
      if (pinModal) root().appendChild(renderPinModal());
    }
  
    function renderPinModal(){
      const wrap = el(`<div class="esth-modal-backdrop"><div class="esth-modal">
        <p class="esth-eyebrow esth-serif">Autorización requerida</p>
        <h2 class="esth-title esth-serif" style="font-size:19px;">${pinModal.title || 'Ingresa el PIN de administrador'}</h2>
        <p class="esth-sub" style="margin-bottom:14px;">${pinModal.message || 'Se modificó un precio base. Autoriza este cobro con el PIN.'}</p>
        ${pinModal.error ? `<p class="esth-error">${pinModal.error}</p>` : ''}
        <div class="esth-field"><input class="esth-pin-input" id="pin-in" type="password" maxlength="6" placeholder="••••"/></div>
        <div class="esth-row">
          <button class="esth-btn ghost" id="pin-cancel">Cancelar</button>
          <button class="esth-btn" id="pin-ok">Autorizar</button>
        </div>
      </div></div>`);
      wrap.querySelector('#pin-cancel').onclick = () => { pinModal = null; render(); };
      const doConfirm = () => {
        const val = wrap.querySelector('#pin-in').value;
        if (val === state.admin.pin){ const fn = pinModal.onConfirm; pinModal = null; fn(); }
        else { pinModal = { ...pinModal, error: 'PIN incorrecto.' }; render(); }
      };
      wrap.querySelector('#pin-ok').onclick = doConfirm;
      wrap.querySelector('#pin-in').addEventListener('keydown', e => { if (e.key === 'Enter') doConfirm(); });
      return wrap;
    }
  
    // ---------- HOME ----------
    function screenHome(){
      const wrap = el(`<div class="esth-screen"><p class="esth-eyebrow esth-serif">Bienvenido</p>
        <h1 class="esth-title esth-serif">${state.chainName}</h1>
        <p class="esth-sub">Elige la sucursal donde vas a trabajar hoy.</p>
        <div class="esth-list" id="branch-list"></div></div>`);
      const list = wrap.querySelector('#branch-list');
      state.branches.forEach(b => {
        const btn = el(`<button class="esth-branch"><span>${b.name}<small>${b.address || ''}</small></span><span></span></button>`);
        btn.onclick = () => { view = { ...view, screen: 'role', branchId: b.id, error: '' }; render(); };
        list.appendChild(btn);
      });
      return wrap;
    }
  
    // ---------- ROLE ----------
    function screenRole(){
      const b = branch();
      const wrap = el(`<div class="esth-screen">
        <button class="esth-btn ghost" id="back">"Cambiar de sucursal"</button>
        <p class="esth-eyebrow esth-serif" style="margin-top:14px;">${b.name}</p>
        <h1 class="esth-title esth-serif">¿Cómo quieres entrar?</h1>
        <p class="esth-sub">Selecciona tu rol para continuar.</p>
        <div class="esth-role-grid">
          <button class="esth-role-btn" id="go-cashier"><div class="esth-role-label">Cajero</div><div class="esth-role-desc">Corte de caja del día</div></button>
          <button class="esth-role-btn" id="go-admin"><div class="esth-role-label">Administrador</div><div class="esth-role-desc">Precios, estilistas y reportes</div></button>
        </div></div>`);
      wrap.querySelector('#back').onclick = () => { view = { screen: 'home', branchId: null, error: '' }; render(); };
      wrap.querySelector('#go-cashier').onclick = () => { view = { ...view, screen: 'cashier', error: '' }; render(); };
      wrap.querySelector('#go-admin').onclick = () => { view = { ...view, screen: 'adminLogin', error: '' }; render(); };
      return wrap;
    }
  
    // ---------- CASHIER ----------
    function screenCashier(){
      const b = branch();
      const t = computeTotals(b);
      const categories = [...new Set(b.services.map(s=>s.category))];
  
      const wrap = el(`<div class="esth-screen">
        <div class="esth-top">
          <div><p class="esth-eyebrow esth-serif">${b.name} · Cajero</p><h1 class="esth-title esth-serif">Corte de caja</h1></div>
          <button class="esth-btn ghost" id="exit">Salir</button>
        </div>
        <p class="esth-eyebrow esth-serif" style="margin-bottom:16px;">${todayStr()}</p>
  
        <div class="esth-card" id="form-servicio">
          <p class="esth-legend" style="font-weight:600;font-size:13px;color:var(--wine-dark);margin-bottom:10px;">Registrar servicio</p>
          <div class="esth-field"><label>Estilista</label><select id="sel-stylist">
            ${b.stylists.map(e => `<option value="${e.id}">${e.name}</option>`).join('') || '<option value="">Sin estilistas</option>'}
          </select></div>
          <div class="esth-field"><label>Servicio</label><select id="sel-service">
            ${categories.map(cat => `<optgroup label="${cat}">${b.services.filter(s=>s.category===cat).map(s=>
              `<option value="${s.id}" data-price="${s.price ?? ''}" data-variable="${s.variable}">${s.name}${s.variable ? ' (precio variable)' : ' — '+money(s.price)}</option>`).join('')}</optgroup>`).join('') || '<option value="">Sin servicios</option>'}
          </select></div>
          <div class="esth-field"><label>Monto a cobrar ($)</label><input id="in-monto" type="number" min="0" step="0.5"/>
            <p class="esth-hint warn" id="pin-hint" style="display:none;">🔒 Este precio difiere del precio base: se pedirá PIN de administrador.</p>
          </div>
  
          <div class="esth-fieldset">
            <p class="esth-legend">Descuento de insumos (opcional)</p>
            <div class="esth-grid2">
              <div class="esth-field"><label>Fracción de tinte</label><select id="in-tinte">
                ${TINTE_FRACCIONES.map(f => `<option value="${f.value}">${f.label}</option>`).join('')}
              </select></div>
              <div class="esth-field"><label>Gramos decolorante</label><input id="in-decolorante" type="number" min="0" placeholder="0"/></div>
            </div>
            <p class="esth-hint" id="insumos-total">Descuento de insumos: ${money(0)}</p>
          </div>
  
          <div class="esth-fieldset">
            <p class="esth-legend">Cobro en caja</p>
            <div class="esth-field"><label>Método de pago</label><select id="sel-method">
              <option value="Efectivo">Efectivo</option><option value="Baucher">Tarjeta / Baucher</option>
            </select></div>
            <div class="esth-grid2" id="efectivo-box">
              <div class="esth-field"><label>Efectivo recibido ($)</label><input id="in-recibido" type="number" min="0" step="0.5"/></div>
              <div class="esth-field"><label>Cambio a entregar ($)</label><input id="in-cambio" type="text" readonly value="${money(0)}"/></div>
            </div>
          </div>
          <button class="esth-btn block" id="btn-servicio" ${b.services.length===0||b.stylists.length===0?'disabled':''}>Cerrar venta / Registrar</button>
        </div>
  
        <p class="esth-section-title">Venta de producto</p>
        <div class="esth-card">
          <div class="esth-grid2">
            <div class="esth-field"><label>Producto</label><input id="prod-nombre" type="text" placeholder="Ej. Shampoo"/></div>
            <div class="esth-field"><label>Precio ($)</label><input id="prod-precio" type="number" min="0" step="0.5"/></div>
          </div>
          <div class="esth-field"><label>Comisión ($)</label><input id="prod-comision" type="number" min="0" step="0.5" value="0"/></div>
          <button class="esth-btn secondary block" id="btn-producto">Agregar venta</button>
        </div>
  
        <p class="esth-section-title">Registro de gastos</p>
        <div class="esth-card">
          <div class="esth-field"><label>Concepto</label><input id="gasto-concepto" type="text" placeholder="Ej. Garrafón, insumos"/></div>
          <div class="esth-field"><label>Monto ($)</label><input id="gasto-monto" type="number" min="0" step="0.5"/></div>
          <button class="esth-btn danger block" id="btn-gasto">Agregar gasto</button>
        </div>
  
        <p class="esth-section-title">Resumen de hoy</p>
        <div class="esth-summary-grid">
          <div class="esth-summary-box"><div class="n">${money(t.totalServicios)}</div><div class="l">Servicios</div></div>
          <div class="esth-summary-box"><div class="n">${money(t.totalProductos)}</div><div class="l">Productos</div></div>
          <div class="esth-summary-box"><div class="n">${money(t.totalGastos)}</div><div class="l">Gastos</div></div>
          <div class="esth-summary-box"><div class="n">${money(t.totalBaucher)}</div><div class="l">Baucher</div></div>
          <div class="esth-summary-box"><div class="n">${money(t.efectivoNeto)}</div><div class="l">Efectivo neto</div></div>
          <div class="esth-summary-box"><div class="n">${money(t.totalUniversal)}</div><div class="l">Total universal</div></div>
        </div>
        <div id="movs" class="esth-card"></div>
      </div>`);
  
      wrap.querySelector('#exit').onclick = () => { view = { screen: 'role', branchId: b.id, error: '' }; render(); };
  
      // live price default + PIN hint
      const serviceSel = wrap.querySelector('#sel-service');
      const montoInput = wrap.querySelector('#in-monto');
      const pinHint = wrap.querySelector('#pin-hint');
      const applyServiceDefault = () => {
        const opt = serviceSel.selectedOptions[0];
        if (!opt) return;
        const isVar = opt.dataset.variable === 'true';
        montoInput.value = isVar ? '' : opt.dataset.price;
        updatePinHint();
      };
      const updatePinHint = () => {
        const opt = serviceSel.selectedOptions[0];
        if (!opt) { pinHint.style.display = 'none'; return; }
        const isVar = opt.dataset.variable === 'true';
        const base = parseFloat(opt.dataset.price);
        const current = parseFloat(montoInput.value);
        const differs = !isVar && !isNaN(current) && !isNaN(base) && current !== base;
        pinHint.style.display = differs ? 'block' : 'none';
      };
      serviceSel.addEventListener('change', applyServiceDefault);
      montoInput.addEventListener('input', updatePinHint);
      applyServiceDefault();
  
      // insumos calc
      const tinteSel = wrap.querySelector('#in-tinte');
      const decoInput = wrap.querySelector('#in-decolorante');
      const insumosLabel = wrap.querySelector('#insumos-total');
      const calcInsumos = () => {
        const tinte = parseFloat(tinteSel.value) || 0;
        const gramos = parseFloat(decoInput.value) || 0;
        const total = tinte + gramos * DECOLORANTE_PRECIO_GR;
        insumosLabel.textContent = 'Descuento de insumos: ' + money(total);
        return total;
      };
      tinteSel.addEventListener('change', calcInsumos);
      decoInput.addEventListener('input', calcInsumos);
  
      // método de pago / cambio
      const methodSel = wrap.querySelector('#sel-method');
      const efectivoBox = wrap.querySelector('#efectivo-box');
      const recibidoInput = wrap.querySelector('#in-recibido');
      const cambioInput = wrap.querySelector('#in-cambio');
      const calcCambio = () => {
        const recibido = parseFloat(recibidoInput.value) || 0;
        const monto = parseFloat(montoInput.value) || 0;
        cambioInput.value = money(Math.max(0, recibido - monto));
      };
      const toggleEfectivo = () => { efectivoBox.style.display = methodSel.value === 'Efectivo' ? 'grid' : 'none'; };
      methodSel.addEventListener('change', toggleEfectivo);
      recibidoInput.addEventListener('input', calcCambio);
      montoInput.addEventListener('input', calcCambio);
      toggleEfectivo();
  
      // registrar servicio
      const doRegisterServicio = async () => {
        const opt = serviceSel.selectedOptions[0];
        const stylist = b.stylists.find(e => e.id === wrap.querySelector('#sel-stylist').value);
        if (!opt || !stylist) return;
        const isVar = opt.dataset.variable === 'true';
        const base = parseFloat(opt.dataset.price);
        const monto = parseFloat(montoInput.value);
        if (isNaN(monto) || monto < 0) return;
        const descuentoInsumos = calcInsumos();
        const entry = {
          id: uid('v'), type: 'servicio', serviceName: opt.textContent.split(' — ')[0].replace(' (precio variable)',''),
          basePrice: isVar ? null : base, price: monto, stylistName: stylist.name,
          method: methodSel.value, cashReceived: methodSel.value==='Efectivo' ? (parseFloat(recibidoInput.value)||0) : null,
          descuentoInsumos, date: new Date().toISOString()
        };
        const finish = async () => { b.sales.unshift(entry); await save(); render(); };
        if (!isVar && monto !== base){
          pinModal = { message: 'El monto (' + money(monto) + ') difiere del precio base (' + money(base) + ') de "' + entry.serviceName + '". Autoriza con PIN.', onConfirm: finish };
          render();
        } else { await finish(); }
      };
      wrap.querySelector('#btn-servicio').onclick = doRegisterServicio;
  
      wrap.querySelector('#btn-producto').onclick = async () => {
        const nombre = wrap.querySelector('#prod-nombre').value.trim();
        const precio = parseFloat(wrap.querySelector('#prod-precio').value);
        const comision = parseFloat(wrap.querySelector('#prod-comision').value) || 0;
        if (!nombre || isNaN(precio) || precio < 0) return;
        b.sales.unshift({ id: uid('p'), type: 'producto', name: nombre, price: precio, commission: comision, date: new Date().toISOString() });
        await save(); render();
      };
  
      wrap.querySelector('#btn-gasto').onclick = async () => {
        const concepto = wrap.querySelector('#gasto-concepto').value.trim();
        const monto = parseFloat(wrap.querySelector('#gasto-monto').value);
        if (!concepto || isNaN(monto) || monto < 0) return;
        b.sales.unshift({ id: uid('g'), type: 'gasto', concept: concepto, amount: monto, date: new Date().toISOString() });
        await save(); render();
      };
  
      // movimientos
      const movsBox = wrap.querySelector('#movs');
      if (t.today.length === 0){
        movsBox.appendChild(el(`<p class="esth-empty">Aún no hay movimientos hoy.</p>`));
      } else {
        const table = el(`<table class="esth-table"><thead><tr><th>Tipo</th><th>Detalle</th><th style="text-align:right;">Monto</th><th></th></tr></thead><tbody></tbody></table>`);
        const tbody = table.querySelector('tbody');
        t.today.forEach(m => {
          let tag, detail, amt;
          if (m.type === 'servicio'){ tag = 'Servicio'; detail = `${m.serviceName} · ${m.stylistName} · ${m.method}`; amt = m.price; }
          else if (m.type === 'producto'){ tag = 'Producto'; detail = m.name; amt = m.price; }
          else { tag = 'Gasto'; detail = m.concept; amt = -m.amount; }
          const row = el(`<tr><td><span class="esth-tag">${tag}</span></td>