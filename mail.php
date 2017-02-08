<?

# TODO: verify origin/referer

require_once "Mail.php";

$user = "iesg.ballotr@gmail.com";
$pass = "iesgballotr";
$host = "ssl://smtp.gmail.com";
$port = "465";

$from = $user;
$to = $_POST["to"];
$subject = $_POST["subject"];
$body = $_POST["body"];

$headers = array (
    'From' => $from,
    'To' => $to,
    'Subject' => $subject);

$smtp = Mail::factory('smtp',
          array (
            'host' => $host,
            'port' => $port,
            'auth' => true,
            'username' => $user,
            'password' => $pass));

echo "About to send mail...";

$mail = $smtp->send($to, $headers, $body);

echo "Sent\n";

if (PEAR::isError($mail)) {
    header("HTTP", true, 503);
} else {
    header("HTTP", true, 200);
}

?>
