<?php
/**
 * Hypestyle API — mu-plugin
 * Subir a: wp-content/mu-plugins/hypestyle-api.php
 */

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! defined('HYPESTYLE_FRONTEND_URL') ) {
    define('HYPESTYLE_FRONTEND_URL', 'https://next-app-mu-orpin.vercel.app');
}

/* ─── LOGGER ────────────────────────────────────────────────────────── */
function hype_log(string $msg): void {
    $file = WP_CONTENT_DIR . '/hypestyle-debug.log';
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL;
    file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
    error_log($msg);
}

/* ─── READ LOG ENDPOINT ─────────────────────────────────────────────── */
add_action('rest_api_init', function() {
    register_rest_route('hypestyle/v1', '/read-log', [
        'methods'             => 'GET',
        'callback'            => function() {
            $file = WP_CONTENT_DIR . '/hypestyle-debug.log';
            if (!file_exists($file)) return new WP_REST_Response(['log' => '(vacío)'], 200);
            $content = file_get_contents($file);
            $lines   = array_slice(explode("\n", trim($content)), -100); // últimas 100 líneas
            return new WP_REST_Response(['log' => implode("\n", $lines)], 200);
        },
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('hypestyle/v1', '/clear-log', [
        'methods'             => 'POST',
        'callback'            => function() {
            $file = WP_CONTENT_DIR . '/hypestyle-debug.log';
            file_put_contents($file, '');
            return new WP_REST_Response(['ok' => true], 200);
        },
        'permission_callback' => '__return_true',
    ]);
});

/* ─── PAYPAL: redirigir thankyou → frontend ────────────────────────── */
add_action('woocommerce_thankyou', function($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) return;
    if ($order->get_payment_method() !== 'ppcp-gateway') return;
    $frontend = defined('HYPESTYLE_FRONTEND_URL') ? HYPESTYLE_FRONTEND_URL : 'https://hypestyle-launchpad.vercel.app';
    wp_redirect($frontend . '/confirmacion/?order=' . $order_id);
    exit;
}, 5);

/* ─── NÚMERO DE ORDEN (empieza en #14900) ──────────────────────────── */
add_filter('woocommerce_order_number', function($order_number, $order) {
    return (string)((int)$order_number + 14899);
}, 10, 2);

/* ─── CORS ─────────────────────────────────────────────────────────── */
add_filter('rest_pre_serve_request', function($served, $result, $request) {
    $allowed = [
        'http://localhost:5173',
        'http://localhost:4173',
        'https://next-app-mu-orpin.vercel.app',
        defined('HYPESTYLE_FRONTEND_URL') ? HYPESTYLE_FRONTEND_URL : '',
        'https://hypestyle.com.ar',
        'https://www.hypestyle.com.ar',
    ];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowed, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-WP-Nonce');
    }
    return $served;
}, 10, 3);

add_action('init', function() {
    $allowed = [
        'http://localhost:5173',
        'http://localhost:4173',
        'https://next-app-mu-orpin.vercel.app',
        defined('HYPESTYLE_FRONTEND_URL') ? HYPESTYLE_FRONTEND_URL : '',
        'https://hypestyle.com.ar',
        'https://www.hypestyle.com.ar',
    ];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowed, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-WP-Nonce');
    }
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        status_header(200);
        exit;
    }
});

/* ─── STOCK ENDPOINT ───────────────────────────────────────────────── */
add_action('rest_api_init', function() {
    register_rest_route('hypestyle/v1', '/stock', [
        'methods'             => 'GET',
        'callback'            => 'hypestyle_get_stock',
        'permission_callback' => '__return_true',
    ]);
});

function hypestyle_get_stock(WP_REST_Request $request) {
    $product_id = (int) $request->get_param('product_id');
    $size       = sanitize_text_field($request->get_param('size'));
    if (!$product_id || !$size) {
        return new WP_Error('missing_params', 'product_id y size son requeridos', ['status' => 400]);
    }
    $product = wc_get_product($product_id);
    if (!$product) {
        return new WP_Error('not_found', 'Producto no encontrado', ['status' => 404]);
    }
    if ($product->is_type('variable')) {
        foreach ($product->get_children() as $child_id) {
            $variant = wc_get_product($child_id);
            if (!$variant) continue;
            $attrs = $variant->get_attributes();
            $variant_size = $attrs['pa_talle'] ?? $attrs['pa_size'] ?? $attrs['talle'] ?? $attrs['size'] ?? '';
            if (strtoupper(trim($variant_size)) === strtoupper(trim($size))) {
                if (!$variant->is_in_stock()) return ['status' => 'out'];
                $qty = $variant->get_stock_quantity();
                if ($qty !== null && $qty <= 2) return ['status' => 'low'];
                return ['status' => 'ok'];
            }
        }
        return ['status' => 'out'];
    }
    if (!$product->is_in_stock()) return ['status' => 'out'];
    return ['status' => 'ok'];
}

/* ─── NEWSLETTER ENDPOINT ──────────────────────────────────────────── */
add_action('rest_api_init', function() {
    register_rest_route('hypestyle/v1', '/newsletter', [
        'methods'             => 'POST',
        'callback'            => 'hypestyle_newsletter_subscribe',
        'permission_callback' => '__return_true',
    ]);
});

function hypestyle_newsletter_subscribe(WP_REST_Request $request) {
    $email = sanitize_email($request->get_param('email'));
    if (!is_email($email)) {
        return new WP_Error('invalid_email', 'Email inválido', ['status' => 400]);
    }
    $list = get_option('hypestyle_newsletter_list', []);
    if (!is_array($list)) $list = [];
    $already = in_array($email, $list, true);
    if (!$already) {
        $list[] = $email;
        update_option('hypestyle_newsletter_list', $list);
        $subject = '¡Bienvenido a Hypestyle! Tu 10% de descuento te espera';
        $body = "Hola,\n\nGracias por suscribirte a Hypestyle.\n\nTu código de descuento: WELCOME10\n\nÚsalo en tu próxima compra.\n\n*No es acumulable con otras promociones.\n\n— Hypestyle Buenos Aires";
        $headers = ['Content-Type: text/plain; charset=UTF-8', 'From: Hypestyle <noreply@hypestyle.com.ar>'];
        wp_mail($email, $subject, $body, $headers);
        wp_mail('hypestylearg@gmail.com', "Nuevo suscriptor: $email", "Se suscribió: $email\nTotal: " . count($list));
    }
    return ['success' => true, 'already' => $already];
}

/* ─── CREATE ORDER ─────────────────────────────────────────────────── */
add_action('rest_api_init', function() {
    register_rest_route('hypestyle/v1', '/create-order', [
        'methods'             => 'POST',
        'callback'            => 'hypestyle_create_order',
        'permission_callback' => '__return_true',
    ]);
});

function hypestyle_create_order(WP_REST_Request $request) {
    $data              = $request->get_json_params();
    $items             = $data['items']             ?? [];
    $customer          = $data['customer']          ?? [];
    $shipping_cost     = (float)($data['shipping']       ?? 0);
    $discount          = (float)($data['discountAmount'] ?? 0);
    $payment_method    = sanitize_text_field($data['paymentMethod']    ?? 'mercadopago');
    $shipping_method_id = sanitize_text_field($data['shippingMethodId'] ?? '');
    $shipping_label    = sanitize_text_field($data['shippingLabel']    ?? 'Andreani — Envío a domicilio');
    $shipping_branch   = sanitize_text_field($data['shippingBranch']   ?? '');

    if (empty($items) || empty($customer['email'])) {
        return new WP_Error('invalid_data', 'Datos incompletos', ['status' => 400]);
    }

    // Crear orden WooCommerce
    $order = wc_create_order();

    // Agregar productos
    foreach ($items as $item) {
        $name  = sanitize_text_field($item['name'] ?? 'Producto');
        $size  = sanitize_text_field($item['size'] ?? '');
        $price = (float)($item['price'] ?? 0);
        $qty   = (int)($item['quantity'] ?? 1);

        $display_name = ($size && $size !== 'U') ? "$name — Talle $size" : $name;

        $line_item = new WC_Order_Item_Product();
        $line_item->set_name($display_name);
        $line_item->set_quantity($qty);
        $line_item->set_subtotal($price * $qty);
        $line_item->set_total($price * $qty);
        if (!empty($size) && $size !== 'U') {
            $line_item->add_meta_data('Talle', $size, true);
        }
        $order->add_item($line_item);
    }

    // Envío
    if ($shipping_cost > 0) {
        $shipping_item = new WC_Order_Item_Shipping();
        $shipping_item->set_name($shipping_label);
        $shipping_item->set_total($shipping_cost);
        if ($shipping_method_id) {
            $shipping_item->set_method_id($shipping_method_id);
            $shipping_item->set_method_title($shipping_label);
        }
        $order->add_item($shipping_item);
    }

    // Descuento
    if ($discount > 0) {
        $fee = new WC_Order_Item_Fee();
        $fee->set_name('Descuento transferencia (10%)');
        $fee->set_total(-$discount);
        $order->add_item($fee);
    }

    // Datos de facturación
    $order->set_billing_first_name(sanitize_text_field($customer['nombre']    ?? ''));
    $order->set_billing_last_name(sanitize_text_field($customer['apellido']   ?? ''));
    $order->set_billing_email(sanitize_email($customer['email']               ?? ''));
    $order->set_billing_phone(sanitize_text_field($customer['telefono']       ?? ''));
    $order->set_billing_address_1(sanitize_text_field($customer['direccion']  ?? ''));
    $order->set_billing_address_2(sanitize_text_field($customer['depto']      ?? ''));
    $order->set_billing_city(sanitize_text_field($customer['ciudad']          ?? ''));
    $order->set_billing_state(sanitize_text_field($customer['provincia']      ?? ''));
    $order->set_billing_postcode(sanitize_text_field($customer['cp']          ?? ''));
    $order->set_billing_country('AR');

    $order->set_shipping_first_name(sanitize_text_field($customer['nombre']   ?? ''));
    $order->set_shipping_last_name(sanitize_text_field($customer['apellido']  ?? ''));
    $order->set_shipping_address_1(sanitize_text_field($customer['direccion'] ?? ''));
    $order->set_shipping_address_2(sanitize_text_field($customer['depto']     ?? ''));
    $order->set_shipping_city(sanitize_text_field($customer['ciudad']         ?? ''));
    $order->set_shipping_state(sanitize_text_field($customer['provincia']     ?? ''));
    $order->set_shipping_postcode(sanitize_text_field($customer['cp']         ?? ''));
    $order->set_shipping_country('AR');

    // Notas
    if (!empty($customer['instagram'])) {
        $order->add_order_note('Instagram: ' . sanitize_text_field($customer['instagram']));
    }
    if (!empty($shipping_branch)) {
        $order->add_order_note('Sucursal Andreani: ' . $shipping_branch);
    }
    if (!empty($customer['dni'])) {
        $order->update_meta_data('_billing_cpf', sanitize_text_field($customer['dni']));
    }

    // Método de pago
    if ($payment_method === 'transferencia') {
        $order->set_payment_method('bacs');
        $order->set_payment_method_title('Transferencia bancaria');
    } elseif ($payment_method === 'paypal') {
        $order->set_payment_method('ppcp-gateway');
        $order->set_payment_method_title('PayPal');
    } else {
        $order->set_payment_method('woo-mercado-pago-basic');
        $order->set_payment_method_title('MercadoPago');
    }

    $order->calculate_totals();
    $order->set_status('pending');
    $order->save();

    $wc_order_id     = $order->get_id();
    $wc_order_number = $order->get_order_number();

    $paypal_url = null;
    if ($payment_method === 'paypal') {
        $paypal_url = $order->get_checkout_payment_url();
    }

    return [
        'wcOrderId'     => $wc_order_id,
        'wcOrderNumber' => (string) $wc_order_number,
        'paypalUrl'     => $paypal_url,
    ];
}

/* ─── MERCADOPAGO PREFERENCE ───────────────────────────────────────── */
function hypestyle_get_mp_access_token(): string {
    // Token hardcodeado de producción
    $hardcoded = 'APP_USR-5535186652777969-050509-94a05c81475696e9711d27ec75b49caa-269150963';
    if (!empty($hardcoded)) return $hardcoded;

    // Fallback: buscar en ajustes del plugin WC MP
    $sources = [
        get_option('woocommerce_woo-mercado-pago-basic_settings',  [])['_mp_access_token_prod'] ?? '',
        get_option('woocommerce_woo-mercado-pago-basic_settings',  [])['access_token']           ?? '',
        get_option('woocommerce_woo-mercado-pago-custom_settings', [])['_mp_access_token_prod']  ?? '',
        get_option('_mp_access_token_prod', ''),
    ];
    foreach ($sources as $token) {
        if (!empty($token)) return $token;
    }
    return '';
}

function hypestyle_create_mp_preference(WC_Order $order, array $items, float $shipping, float $discount): ?string {
    $access_token = hypestyle_get_mp_access_token();
    if (!$access_token) return null;

    $mp_items = [];
    foreach ($items as $item) {
        $size  = $item['size'] ?? '';
        $title = $item['name'] ?? 'Producto';
        if ($size && $size !== 'U') $title .= " — Talle $size";
        $mp_items[] = [
            'id'          => (string)($item['slug'] ?? $item['id'] ?? 'item'),
            'title'       => $title,
            'quantity'    => (int)($item['quantity'] ?? 1),
            'unit_price'  => (float)($item['price']  ?? 0),
            'currency_id' => 'ARS',
            'picture_url' => $item['image'] ?? '',
        ];
    }
    if ($shipping > 0) {
        $mp_items[] = [
            'id'         => 'envio',
            'title'      => 'Envío — Andreani',
            'quantity'   => 1,
            'unit_price' => $shipping,
            'currency_id'=> 'ARS',
        ];
    }

    $frontend  = defined('HYPESTYLE_FRONTEND_URL') ? HYPESTYLE_FRONTEND_URL : 'https://hypestyle-launchpad.vercel.app';
    $order_id  = $order->get_id();

    $preference = [
        'items'              => $mp_items,
        'external_reference' => (string)$order_id,
        'back_urls'          => [
            'success' => "$frontend/confirmacion/?order=$order_id",
            'pending' => "$frontend/pendiente-de-pago/?order=$order_id",
            'failure' => "$frontend/checkout/",
        ],
        'auto_return'        => 'approved',
        'notification_url'   => get_site_url() . '/wp-json/hypestyle/v1/mp-webhook',
        'payer'              => [
            'email'   => $order->get_billing_email(),
            'name'    => $order->get_billing_first_name(),
            'surname' => $order->get_billing_last_name(),
        ],
        'payment_methods'    => [
            'installments' => 3,
        ],
    ];

    $res = wp_remote_post('https://api.mercadopago.com/checkout/preferences', [
        'headers' => [
            'Content-Type'  => 'application/json',
            'Authorization' => "Bearer $access_token",
        ],
        'body'    => wp_json_encode($preference),
        'timeout' => 20,
    ]);

    if (is_wp_error($res)) return null;
    $body = json_decode(wp_remote_retrieve_body($res), true);
    return $body['init_point'] ?? null;
}

/* ─── ANDREANI BRANCHES ─────────────────────────────────────────────── */
add_action('wp_ajax_nopriv_hype_andreani_branches', 'hypestyle_ajax_andreani_branches');
add_action('wp_ajax_hype_andreani_branches',        'hypestyle_ajax_andreani_branches');

function hypestyle_ajax_andreani_branches() {
    $cp = sanitize_text_field($_POST['cp'] ?? '');
    if (!$cp) { wp_send_json(['branches' => [], 'error' => 'cp requerido']); return; }

    // Obtener credenciales del plugin
    $settings  = get_option('woocommerce_andreani_flexipaas_1_settings', []);
    $pyme_info = maybe_unserialize(get_option('andreani_pyme_info', []));
    if (!is_array($pyme_info)) $pyme_info = [];

    $hash      = $settings['hash_andreani'] ?? '';
    $decoded   = base64_decode($hash); // "Pyme|{sha256_pass_base64}"
    $parts     = explode('|', $decoded, 2);
    $pass_hash = $parts[1] ?? '';

    $usuario_id = $pyme_info['usuarioId'] ?? '';
    $cl         = $pyme_info['cl']        ?? '';

    hype_log('[andreani-branches] cp=' . $cp . ' cl=' . $cl . ' usuario=' . $usuario_id);

    // Intentar obtener token de sesión desde transiente cacheado
    $token = get_transient('hypestyle_andreani_token');

    if (!$token) {
        // Login con usuario = cl code y password = sha256 base64
        foreach (['https://apis.andreani.com/login', 'https://apis.andreani.com/v2/usuarios/login'] as $login_url) {
            $login_res = wp_remote_post($login_url, [
                'headers' => ['Content-Type' => 'application/json'],
                'body'    => wp_json_encode(['usuario' => $cl ?: $usuario_id, 'password' => $pass_hash]),
                'timeout' => 15,
            ]);
            if (is_wp_error($login_res)) continue;
            $code  = wp_remote_retrieve_response_code($login_res);
            $token = wp_remote_retrieve_header($login_res, 'x-andreani-session');
            $body  = json_decode(wp_remote_retrieve_body($login_res), true);
            if (!$token) $token = $body['token'] ?? '';
            hype_log('[andreani-branches] login url=' . $login_url . ' code=' . $code . ' token_ok=' . (!empty($token) ? 'si' : 'no'));
            if ($token) { set_transient('hypestyle_andreani_token', $token, 3600); break; }
        }
    }

    if (!$token) {
        hype_log('[andreani-branches] sin token — usando hash directo');
        $token = $hash; // último recurso
    }

    // Consultar sucursales
    $url = 'https://apis.andreani.com/v2/sucursales?codigoPostal=' . urlencode($cp);
    $contratos = $pyme_info['contratos'] ?? [];
    if (is_array($contratos) && !empty($contratos[0])) {
        $contrato_num = $contratos[0]['numero'] ?? $contratos[0]['contrato'] ?? '';
        if ($contrato_num) $url .= '&contrato=' . urlencode($contrato_num);
    }

    $res = wp_remote_get($url, [
        'headers' => ['x-andreani-session' => $token, 'Authorization' => 'Bearer ' . $token],
        'timeout' => 15,
    ]);

    if (is_wp_error($res)) {
        hype_log('[andreani-branches] http error: ' . $res->get_error_message());
        wp_send_json(['branches' => [], 'error' => $res->get_error_message()]);
        return;
    }

    $code     = wp_remote_retrieve_response_code($res);
    $raw_body = wp_remote_retrieve_body($res);
    $body     = json_decode($raw_body, true);
    hype_log('[andreani-branches] code=' . $code . ' count=' . count((array)$body) . ' raw=' . substr($raw_body, 0, 200));

    if ($code === 401) {
        delete_transient('hypestyle_andreani_token');
    }

    $branches = [];
    if (is_array($body)) {
        foreach ($body as $b) {
            $nombre = $b['descripcion'] ?? $b['nombre'] ?? $b['razonSocial'] ?? '';
            $dir    = $b['direccion'] ?? [];
            if (is_array($dir)) {
                $direccion = trim(($dir['calle'] ?? '') . ' ' . ($dir['numero'] ?? '') . ', ' . ($b['localidad'] ?? ''));
            } else {
                $direccion = (string)$dir;
            }
            $id = (string)($b['numero'] ?? $b['id'] ?? $b['sucursalId'] ?? '');
            if ($nombre) $branches[] = ['id' => $id, 'label' => $nombre, 'direccion' => $direccion];
        }
    }

    wp_send_json(['branches' => $branches, 'code' => $code]);
}

/* ─── SHIPPING RATES (via AJAX para WC completo) ───────────────────── */
add_action('wp_ajax_nopriv_hype_shipping_rates', 'hypestyle_ajax_shipping_rates');
add_action('wp_ajax_hype_shipping_rates',        'hypestyle_ajax_shipping_rates');

function hypestyle_ajax_shipping_rates() {
    $cp       = sanitize_text_field($_POST['cp']       ?? '');
    $provincia = sanitize_text_field($_POST['provincia'] ?? '');
    $valor    = (float)($_POST['valor']    ?? 10000);
    $peso_kg  = (float)($_POST['peso']     ?? 0.5);

    if (!$cp) { wp_send_json(['rates' => [], 'error' => 'cp requerido']); }

    $estados = [
        'Buenos Aires' => 'BA', 'CABA' => 'C', 'Catamarca' => 'K',
        'Chaco' => 'H', 'Chubut' => 'U', 'Córdoba' => 'X',
        'Corrientes' => 'W', 'Entre Ríos' => 'E', 'Formosa' => 'P',
        'Jujuy' => 'Y', 'La Pampa' => 'L', 'La Rioja' => 'F',
        'Mendoza' => 'M', 'Misiones' => 'N', 'Neuquén' => 'Q',
        'Río Negro' => 'R', 'Salta' => 'A', 'San Juan' => 'J',
        'San Luis' => 'D', 'Santa Cruz' => 'Z', 'Santa Fe' => 'S',
        'Santiago del Estero' => 'G', 'Tierra del Fuego' => 'V',
        'Tucumán' => 'T',
    ];
    $state = $estados[$provincia] ?? 'BA';

    // Inicializar sesión y customer de WC para que el plugin lea el destino
    if (!WC()->session) {
        WC()->session = new WC_Session_Handler();
        WC()->session->init();
    }
    if (!WC()->customer) {
        WC()->customer = new WC_Customer(0, true);
    }
    WC()->customer->set_shipping_country('AR');
    WC()->customer->set_shipping_state($state);
    WC()->customer->set_shipping_postcode($cp);
    WC()->customer->set_shipping_city('');

    // Producto mock con peso y dimensiones (indumentaria promedio)
    $mock = new WC_Product_Simple();
    $mock->set_weight($peso_kg);
    $mock->set_length(30);
    $mock->set_width(25);
    $mock->set_height(5);
    $mock->set_virtual(false);
    $mock->set_tax_status('none');

    $package = [
        'contents'        => [
            'hype_0' => [
                'key'               => 'hype_0',
                'product_id'        => 0,
                'variation_id'      => 0,
                'variation'         => [],
                'quantity'          => 1,
                'data'              => $mock,
                'data_hash'         => '',
                'line_tax_data'     => ['subtotal' => [], 'total' => []],
                'line_subtotal'     => $valor,
                'line_subtotal_tax' => 0,
                'line_total'        => $valor,
                'line_tax'          => 0,
            ],
        ],
        'contents_cost'   => $valor,
        'applied_coupons' => [],
        'user'            => ['ID' => 0],
        'destination'     => [
            'country'   => 'AR',
            'state'     => $state,
            'postcode'  => $cp,
            'city'      => '',
            'address'   => '',
            'address_2' => '',
        ],
        'cart_subtotal'   => $valor,
    ];

    try {
        $shipping   = WC()->shipping();
        $shipping->reset_shipping();
        $calculated = $shipping->calculate_shipping_for_package($package);
        $raw_rates  = $calculated['rates'] ?? [];
    } catch (Exception $e) {
        hype_log('[shipping-ajax] exception: ' . $e->getMessage());
        wp_send_json(['rates' => [], 'error' => $e->getMessage()]);
    }

    hype_log('[shipping-ajax] CP=' . $cp . ' state=' . $state . ' rates=' . json_encode(array_keys($raw_rates)) . ' count=' . count($raw_rates));

    $rates = [];
    foreach ($raw_rates as $id => $rate) {
        $rates[] = [
            'id'    => $id,
            'label' => $rate->get_label(),
            'cost'  => (float) $rate->get_cost(),
        ];
    }

    wp_send_json(['rates' => $rates]);
}

/* ─── ANDREANI CONFIG DUMP (diagnostico) ───────────────────────────── */
add_action('rest_api_init', function() {
    register_rest_route('hypestyle/v1', '/andreani-config', [
        'methods'             => 'GET',
        'callback'            => function() {
            global $wpdb;
            $zones   = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}woocommerce_shipping_zones", ARRAY_A);
            $locs    = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}woocommerce_shipping_zone_locations", ARRAY_A);
            $methods = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}woocommerce_shipping_zone_methods", ARRAY_A);
            $opts    = $wpdb->get_results(
                "SELECT option_name, option_value FROM {$wpdb->options}
                 WHERE option_name LIKE '%andreani%'
                    OR option_name LIKE '%shipping%zone%'
                    OR option_name LIKE 'woocommerce_%_settings'
                 LIMIT 80",
                ARRAY_A
            );
            return new WP_REST_Response([
                'zones'   => $zones,
                'locations' => $locs,
                'methods' => $methods,
                'options' => $opts,
            ], 200);
        },
        'permission_callback' => '__return_true',
    ]);
});

/* ─── CONFIRM PAYMENT (fallback client-triggered) ─────────────────── */
add_action('rest_api_init', function() {
    register_rest_route('hypestyle/v1', '/confirm-payment', [
        'methods'             => 'POST',
        'callback'            => 'hypestyle_confirm_payment',
        'permission_callback' => '__return_true',
    ]);
});

function hypestyle_confirm_payment(WP_REST_Request $request) {
    $body       = $request->get_json_params() ?? [];
    $payment_id = sanitize_text_field($body['payment_id'] ?? '');
    $order_id   = (int)($body['order_id'] ?? 0);

    if (!$payment_id || !$order_id) {
        return new WP_REST_Response(['ok' => false, 'error' => 'missing_params'], 400);
    }

    $access_token = hypestyle_get_mp_access_token();
    if (!$access_token) return new WP_REST_Response(['ok' => false], 500);

    $res = wp_remote_get("https://api.mercadopago.com/v1/payments/{$payment_id}", [
        'headers' => ['Authorization' => "Bearer $access_token"],
        'timeout' => 15,
    ]);

    if (is_wp_error($res)) {
        error_log('[hypestyle-confirm-payment] error: ' . $res->get_error_message());
        return new WP_REST_Response(['ok' => false], 500);
    }

    $payment = json_decode(wp_remote_retrieve_body($res), true);
    $mp_ref  = (int)($payment['external_reference'] ?? 0);
    $status  = $payment['status'] ?? '';

    error_log("[hypestyle-confirm-payment] payment_id={$payment_id} status={$status} mp_ref={$mp_ref} order_id={$order_id}");

    if ($mp_ref !== $order_id) {
        error_log("[hypestyle-confirm-payment] ref mismatch — rejected");
        return new WP_REST_Response(['ok' => false, 'error' => 'ref_mismatch'], 400);
    }

    $order = wc_get_order($order_id);
    if (!$order) return new WP_REST_Response(['ok' => false, 'error' => 'order_not_found'], 404);

    if ($status === 'approved' && $order->needs_payment()) {
        $order->payment_complete((string)$payment_id);
        $order->add_order_note("Pago confirmado via back_url. Payment ID: {$payment_id}");
        error_log('[hypestyle-confirm-payment] Orden #' . $order_id . ' marcada como pagada.');
    }

    return new WP_REST_Response(['ok' => true, 'status' => $status], 200);
}

/* ─── DEBUG MP (temporal) ──────────────────────────────────────────── */
add_action('rest_api_init', function() {
    register_rest_route('hypestyle/v1', '/debug-mp', [
        'methods'             => 'GET',
        'callback'            => function() {
            $token = hypestyle_get_mp_access_token();
            $res = wp_remote_post('https://api.mercadopago.com/checkout/preferences', [
                'headers' => [
                    'Content-Type'  => 'application/json',
                    'Authorization' => "Bearer $token",
                ],
                'body'    => wp_json_encode([
                    'items' => [['title' => 'Test', 'quantity' => 1, 'unit_price' => 100, 'currency_id' => 'ARS']],
                ]),
                'timeout' => 15,
            ]);
            if (is_wp_error($res)) {
                return ['error' => $res->get_error_message(), 'token_prefix' => substr($token, 0, 20)];
            }
            $body = json_decode(wp_remote_retrieve_body($res), true);
            return [
                'token_prefix'       => substr($token, 0, 20),
                'init_point'         => $body['init_point']         ?? null,
                'sandbox_init_point' => $body['sandbox_init_point'] ?? null,
                'mp_error'           => $body['message']            ?? null,
                'mp_status'          => $body['status']             ?? null,
            ];
        },
        'permission_callback' => '__return_true',
    ]);
});

/* ─── MERCADOPAGO WEBHOOK ──────────────────────────────────────────── */
add_action('rest_api_init', function() {
    register_rest_route('hypestyle/v1', '/mp-webhook', [
        'methods'             => ['GET', 'POST'],
        'callback'            => 'hypestyle_mp_webhook',
        'permission_callback' => '__return_true',
    ]);
});

function hypestyle_mp_webhook(WP_REST_Request $request) {
    $body        = $request->get_json_params() ?? [];
    $query       = $request->get_query_params();

    // Formato nuevo: POST con body {"type":"payment","data":{"id":"123"}}
    $type    = $body['type']        ?? $body['topic']        ?? $query['type']  ?? $query['topic']  ?? '';
    $data_id = $body['data']['id']  ?? $body['data_id']      ?? $query['data_id'] ?? $query['id']  ?? null;

    error_log('[hypestyle-mp-webhook] type=' . $type . ' data_id=' . $data_id . ' query=' . json_encode($query) . ' body=' . json_encode($body));

    // MP también envía pings de validación sin type — devolver 200 siempre
    if (!$data_id) return new WP_REST_Response(['ok' => true], 200);
    if (!in_array($type, ['payment', 'merchant_order', ''], true) && $type !== '') return new WP_REST_Response(['ok' => true], 200);

    $access_token = hypestyle_get_mp_access_token();
    if (!$access_token) return new WP_REST_Response(['ok' => true], 200);

    $res = wp_remote_get("https://api.mercadopago.com/v1/payments/{$data_id}", [
        'headers' => ['Authorization' => "Bearer $access_token"],
        'timeout' => 15,
    ]);

    if (is_wp_error($res)) {
        error_log('[hypestyle-mp-webhook] wp_remote_get error: ' . $res->get_error_message());
        return new WP_REST_Response(['ok' => true], 200);
    }

    $payment  = json_decode(wp_remote_retrieve_body($res), true);
    $order_id = (int)($payment['external_reference'] ?? 0);
    $status   = $payment['status'] ?? '';

    error_log('[hypestyle-mp-webhook] payment status=' . $status . ' order_id=' . $order_id);

    if (!$order_id) return new WP_REST_Response(['ok' => true], 200);

    $order = wc_get_order($order_id);
    if (!$order) return new WP_REST_Response(['ok' => true], 200);

    if ($status === 'approved') {
        $order->payment_complete((string)$data_id);
        $order->add_order_note("Pago aprobado via MercadoPago. Payment ID: {$data_id}");
        error_log('[hypestyle-mp-webhook] Orden #' . $order_id . ' marcada como pagada.');
    } elseif (in_array($status, ['pending', 'in_process', 'authorized'], true)) {
        $order->update_status('on-hold', "Pago pendiente/en proceso. Payment ID: {$data_id}");
    } elseif ($status === 'rejected') {
        $order->update_status('failed', "Pago rechazado. Payment ID: {$data_id}");
    }

    return new WP_REST_Response(['ok' => true], 200);
}
