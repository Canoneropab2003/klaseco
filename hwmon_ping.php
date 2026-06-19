    <?php
    declare(strict_types=1);

    header("Content-Type: application/json; charset=utf-8");
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

    require __DIR__ . '/supabase_conn.php';

    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);

    $device_key  = trim((string)($data["device_key"] ?? ""));
    $room_code   = strtoupper(trim((string)($data["room_code"] ?? "")));
    $power_state = strtolower(trim((string)($data["power_state"] ?? "off"))); // "on"/"off"
    $last_error  = trim((string)($data["last_error"] ?? ""));

    if ($device_key === "" || $room_code === "") {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Missing device_key/room_code"]);
    exit;
    }

    if ($power_state !== "on" && $power_state !== "off") $power_state = "off";

    try {
    // Ensure row exists (auto-create)
    $pdo->beginTransaction();

    $exists = $pdo->prepare("SELECT id FROM public.hardware_monitor_devices WHERE device_key = :k LIMIT 1");
    $exists->execute([":k" => $device_key]);
    $row = $exists->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        // If you already store label/type elsewhere, set your defaults here
        $ins = $pdo->prepare("
        INSERT INTO public.hardware_monitor_devices
            (room_code, device_key, device_label, device_type, monitor_status, power_state, last_active, last_error, is_active)
        VALUES
            (:room, :k, :label, :type, 'online', :pstate, now(), NULL, true)
        RETURNING id
        ");
        $ins->execute([
        ":room"  => $room_code,
        ":k"     => $device_key,
        ":label" => $device_key,
        ":type"  => "light",   // <-- change if you want automatic type mapping
        ":pstate"=> $power_state
        ]);
    } else {
        $upd = $pdo->prepare("
        UPDATE public.hardware_monitor_devices
        SET
            room_code = :room,
            monitor_status = 'online',
            power_state = :pstate,
            last_active = now(),
            last_error = CASE WHEN :err = '' THEN NULL ELSE :err END
        WHERE device_key = :k
        RETURNING device_key, monitor_status, power_state, last_active
        ");
        $upd->execute([
        ":room"   => $room_code,
        ":pstate" => $power_state,
        ":err"    => $last_error,
        ":k"      => $device_key
        ]);
        $out = $upd->fetch(PDO::FETCH_ASSOC);
    }

    $pdo->commit();
    echo json_encode(["success" => true, "data" => $out ?? ["device_key"=>$device_key]]);
    } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
