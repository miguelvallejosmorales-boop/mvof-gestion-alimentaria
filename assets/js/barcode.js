/* MVOF - Integracion con Open Food Facts */
const OFF_API_URL = "https://world.openfoodfacts.org/api/v2/product/";
async function buscarProductoPorCodigoBarra(codigo){
  if (!codigo || codigo.length < 8){ toast("Codigo invalido","err"); return null; }
  try{
    const fields = "product_name,product_name_es,brands,image_url,image_small_url,nutriments,nutriscore_grade,nova_group,quantity,categories";
    const url = OFF_API_URL + codigo + ".json?fields=" + fields;
    toast("Buscando producto...");
    const resp = await fetch(url);
    if (resp.status === 404){ return await manejarProductoNoEncontrado(codigo); }
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const data = await resp.json();
    if (data.status !== 1 || !data.product){ return await manejarProductoNoEncontrado(codigo); }
    return parseOpenFoodFactsProduct(codigo, data.product);
  }catch(e){
    if (e.message.includes("fetch") || e.message.includes("network")){
      toast("Sin conexion, ingresa datos manualmente", "err");
      return await pedirDatosManuales(codigo);
    }
    toast("Error: " + e.message, "err");
    return null;
  }
}
async function manejarProductoNoEncontrado(codigo){
  const usar = confirm("Este producto (" + codigo + ") no esta en Open Food Facts.\n\n¿Quieres ingresarlo manualmente?");
  if (!usar) return null;
  return await pedirDatosManuales(codigo);
}
async function pedirDatosManuales(codigo){
  const nombre = prompt("Nombre del producto:"); if (!nombre) return null;
  const marca = prompt("Marca (opcional):") || "";
  const kcal = parseFloat(prompt("Kcal por 100g/ml (0 si no sabes):", "0")) || 0;
  const prot = parseFloat(prompt("Proteina por 100g/ml (0 si no sabes):", "0")) || 0;
  const carb = parseFloat(prompt("Carbohidratos por 100g/ml (0 si no sabes):", "0")) || 0;
  const grasa = parseFloat(prompt("Grasa por 100g/ml (0 si no sabes):", "0")) || 0;
  return { codigo_barra:codigo, nombre, marca, imagen_url:"", unidad:"gr",
    kcal_100:kcal, prot_100:prot, carb_100:carb, grasa_100:grasa, nutri_score:"", nova_group:null, manual:true };
}
function parseOpenFoodFactsProduct(codigo, p){
  const n = p.nutriments || {};
  const nombre = p.product_name_es || p.product_name || "Producto sin nombre";
  return {
    codigo_barra: codigo, nombre, marca: p.brands || "",
    imagen_url: p.image_small_url || p.image_url || "", unidad: "gr",
    kcal_100:  redondear(n["energy-kcal_100g"] || (n["energy_100g"] ? n["energy_100g"]/4.184 : 0)),
    prot_100:  redondear(n.proteins_100g || 0),
    carb_100:  redondear(n.carbohydrates_100g || 0),
    grasa_100: redondear(n.fat_100g || 0),
    nutri_score: (p.nutriscore_grade || "").toUpperCase(),
    nova_group: p.nova_group || null
  };
}
function redondear(n){ return Math.round((+n || 0) * 100) / 100; }
async function llenarFormularioIngredienteDesdeBarcode(codigo){
  const producto = await buscarProductoPorCodigoBarra(codigo);
  if (!producto) return;
  if ($("i-nombre"))  $("i-nombre").value  = producto.nombre + (producto.marca ? " - " + producto.marca : "");
  if ($("i-unidad"))  $("i-unidad").value  = "gr";
  if ($("i-kcal"))    $("i-kcal").value    = producto.kcal_100;
  if ($("i-prot"))    $("i-prot").value    = producto.prot_100;
  if ($("i-carb"))    $("i-carb").value    = producto.carb_100;
  if ($("i-grasa"))   $("i-grasa").value   = producto.grasa_100;
  toast("Producto cargado: " + producto.nombre);
  return producto;
}
async function escanearManualmente(){
  const codigo = prompt("Ingresa el codigo de barras (8-13 digitos):");
  if (!codigo) return;
  await llenarFormularioIngredienteDesdeBarcode(codigo.trim());
}
async function escanearConCamara(){
  if (typeof abrirScanner === "function"){
    abrirScanner(async function(codigo){ await llenarFormularioIngredienteDesdeBarcode(codigo); });
  } else { toast("Scanner no disponible", "err"); }
}
