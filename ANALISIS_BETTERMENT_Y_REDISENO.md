# Auditoría de diseño de Betterment y aplicación a JH Inversiones

Fecha de revisión: 20 de octubre de 2026. Sitios de referencia: https://www.betterment.com/, https://www.betterment.com/pricing y https://www.betterment.com/mobile-app. Referencias complementarias: https://www.shadcn.io/design/betterment y https://nananozaki.com/2026/05/02/betterment/.

> Documento de referencia de diseño, no auditoría técnica intrusiva del código de Betterment. Se revisaron las páginas públicas y referencias disponibles. Algunas capturas de terceros pertenecen a versiones anteriores; la fuente principal de estructura y textos es el sitio actual. El nuevo diseño no reutiliza marca, logotipos, imágenes ni fuentes propietarias de Betterment.

## 1. Diagnóstico del sitio de referencia

### 1.1 Posicionamiento y psicología visual
Betterment se presenta como una herramienta para facilitar la inversión, no como un sitio centrado en porcentajes extraordinarios. La promesa principal se expresa en lenguaje cotidiano, priorizando confianza, automatización, control y ahorro de tiempo. Este enfoque disminuye la carga cognitiva del visitante. La propuesta no abre con un catálogo técnico, sino con el beneficio de usuario.

### 1.2 Arquitectura de la página actual
Orden observable en su homepage pública:

1. Navegación con públicos diferenciados, acceso y CTA principal.
2. Hero de propuesta de valor, beneficios resumidos y CTA.
3. Ofertas promocionales para clientes nuevos, con condiciones.
4. Recorrido por las categorías de producto y acceso rápido.
5. Comparativa de formas de invertir, con interfaces visuales.
6. Bloques específicos de ahorro, jubilación y gestión de efectivo.
7. Seguridad y confianza: información fiduciaria, protección y experiencia del equipo.
8. Pruebas de escala, reseñas y divulgaciones.
9. Preguntas frecuentes y CTA final.

**Aplicación:** JH conserva la cadencia pero la simplifica conforme al alcance real: hero → beneficios → experiencia del dashboard → proceso → planes → simulador → preguntas → CTA. No se ofrecen categorías como IRAs o gestión automática porque el proyecto no las tiene.

### 1.3 Paleta y jerarquía visual
La identidad documentada de Betterment emplea azul marino profundo, azul cobalto, detalles dorados y fondos cálidos crema. Su contraste hace que el hero se sienta sólido, y el resto de la página resulte legible y accesible. Se alternan superficies opacas con componentes tangibles de esquinas suaves y sombras cuidadas.

**Tokens originales desarrollados para JH (no idénticos a los de Betterment):**

| Función | Token JH | Razón |
|---|---|---|
| Base oscura | `#070e46` | Profundidad y credibilidad sin negro puro |
| Azul interactivo | `#2469f6` | Interacción y progreso |
| Acento cálido | `#ffd34f` | CTA y puntos de atención |
| Fondo claro | `#f8f5ee` | Ritmo editorial cálido |
| Texto principal | `#131a35` | Legibilidad |
| Texto secundario | `#65708b` | Jerarquía limpia |

### 1.4 Tipografía
Betterment combina tipografía de titulares con personalidad editorial y tipografía muy funcional para la UI. Sus fuentes comerciales no se redistribuyen. En JH se usa una serif estándar para títulos y Arial/Helvetica para interfaz, con tamaños escalables y énfasis en contraste y espacio en blanco. Puede reemplazarse posteriormente por familias comerciales con licencia.

### 1.5 Componentes de producto
Una fortaleza de Betterment es ilustrar sus productos con capturas de interfaces: saldos, distribución de cartera, gráficas, metas y tarjetas. Esto es más convincente que fotografías genéricas de negocios. Para JH se creó un mockup propio del panel, con balance **hipotético claramente identificado**, gráfico, plazo y progreso. Se integra en el hero y en el bloque interactivo de funciones.

### 1.6 Movimiento y microinteracciones
El mejor movimiento guía la mirada; el exceso resta credibilidad en productos financieros. En JH se aplican:
- apariciones suaves por desplazamiento, sin bloquear contenido;
- fondo circular de profundidad y tarjetas flotantes lentas;
- evolución dibujada del gráfico de ejemplo;
- pestañas de producto con animaciones de transición;
- tarjetas elevadas sutilmente al pasar el cursor;
- FAQ expandible;
- control deslizante del simulador con respuesta inmediata;
- barra de avance de lectura;
- respeto a `prefers-reduced-motion`.

### 1.7 Móvil
La página de Betterment dedicada a su aplicación prioriza lectura del saldo, operaciones y seguimiento de desempeño. Esa filosofía se adopta en JH para un sitio web responsive: botones táctiles amplios, controles sin hover obligatorio, grupos apilados, navegación desplegable y cards del dashboard adaptables. Se evita prometer una aplicación móvil nativa, que no está incluida en el alcance.

## 2. Qué se implementó en el rediseño JH

| Referencia conceptual | Decisión implementada en JH |
|---|---|
| Hero con propuesta directa | «Tu futuro merece una mejor perspectiva» con botones a planes y dashboard |
| Interfaz producto como protagonista | Dashboard ficticio visual en el hero con cifra hipotética y tendencia estilizada |
| Contraste color editorial | Hero marino, secciones crema/blanco, bloque azul y CTA amarillo |
| Beneficios escaneables | Tres cards: explorar, visualizar y gestionar |
| Producto explicado visualmente | Pestañas Mi resumen / Seguimiento / Solicitudes |
| Comienzo sencillo | Tres pasos breves para un usuario nuevo |
| Precios claramente comparables | Tres planes de demostración: Impulso, Órbita y Horizonte |
| Interacción para comprender | Simulador de montos con cálculos ilustrativos por plazo |
| Preguntas y confianza | FAQ específico con limitaciones, riesgos y reglas de reclamaciones |
| CTA de cierre | Sección final con llamada a explorar, sin promesas de beneficio |
| Experiencia unificada | Estilos azules aplicados también al acceso, dashboard y páginas legales |

## 3. Hallazgos importantes de conversión

1. **Un hero debe responder en 5 segundos:** qué es la plataforma, por qué interesa y qué puede hacer el usuario enseguida.
2. **Mostrar el dashboard antes de pedir registro:** reduce incertidumbre sobre lo que se recibe al ingresar.
3. **La CTA principal conduce a una acción concreta:** planes y simulador, en lugar de múltiples enlaces sin prioridad.
4. **Los textos deben ser verificables:** no inventar reseñas, licencias, certificaciones o clientes. Betterment sí puede mostrar pruebas propias; JH aún no.
5. **El simulador ha de ser una herramienta educativa:** nunca confundir una cifra calculada por tiempo con una ganancia real o balance verificable.
6. **La explicación de la reclamación debe ser precisa:** botón de solicitud, notificación administrativa y revisión; sin afirmar pago instantáneo.
7. **No hay que copiar promociones ni rendimientos de la competencia:** no aplican al producto JH.

## 4. Experiencia de usuario sugerida

**Ruta de nuevo visitante** → llegada a landing → comprende beneficio → revisa planes → usa simulador → lee condiciones → explora dashboard demo → decide si solicita acceso.

**Ruta de usuario existente** → accede mediante autenticación → revisa información de sus planes registrados → observa fechas y avance → presenta reclamación al vencimiento → espera revisión administrativa.

**Ruta del administrador (futura)** → recibe solicitudes verificadas → revisa identidad, plan, condiciones y pagos → gestiona trámite → registra resultado y notifica estado. La consola administrativa y conciliación aún requieren implementación antes de producción.

## 5. SEO y posicionamiento

- `title`, `description` y Open Graph configurados desde Next.js.
- `sitemap.ts` y `robots.ts` incluidos en el proyecto.
- Estructura semántica con H1 único en home y H2 por bloque.
- Enlaces internos a beneficio, experiencia, planes, simulador y preguntas.
- Reducir peso de recursos visuales: ilustraciones SVG/CSS en lugar de imágenes gigantes.
- Antes de producción: comprobar Core Web Vitals, LCP, CLS, INP, navegación con teclado y contraste WCAG.
- Para SEO/GEO futuros: páginas informativas originales, políticas claras, perfiles de empresa verificables, términos comprensibles, FAQ reales y contenido educativo supervisado. No prometer posiciones en Google.

## 6. Arquitectura técnica conservada

- Next.js App Router + TypeScript.
- React + Framer Motion para animaciones.
- Diseño en `src/app/betterment-inspired.css`.
- Parámetros de marca en `src/lib/brand.ts`.
- Planes e hipótesis en `src/lib/plans.ts`.
- Simulador y panel en componentes independientes.
- Supabase opcional para sesiones y registro.
- API de pagos y webhook firmado solo para activar tras revisión y aceptación del proveedor.
- Notificaciones de solicitudes vía correo, con condiciones y revisión por servidor.
- Preparación de Vercel, sin despliegue efectuado.

## 7. Prioridades para una versión comercial

**P0 (obligatorio):** revisión jurídica/regulatoria; contratos y riesgos; KYC/AML cuando corresponda; proveedor de pago aprobado; conciliación bancaria y custodia; fuente verificable de saldos y rendimientos; políticas de privacidad y seguridad.

**P1:** panel administrativo; validación y estados de reclamación; pruebas automatizadas e integraciones; límites de solicitudes; auditoría; sistema de correos resiliente; monitorización.

**P2:** contenido educativo periódico, páginas de planes detalladas, flujos onboarding completos, analítica de conversión respetuosa de privacidad, experimentos A/B y optimización SEO.

## 8. Limitaciones de este análisis

- El diseño de Betterment cambia con el tiempo. Algunas referencias complementarias y screenshots muestran versiones anteriores, no necesariamente el hero actual.
- La investigación se basa en contenido público del sitio y referencias documentadas; no se realizó una inspección instrumental de animaciones en el navegador remoto.
- El rediseño de JH presenta **mockups propios**, no capturas ni activos de Betterment.
- La instalación npm y compilación completa no se han validado en este entorno sin acceso a npm. La sintaxis TypeScript/TSX modificada sí se revisó; se recomienda ejecutar `npm run typecheck` y `npm run build` al instalar las dependencias.
