<?php
class GoogleService {
    function __construct () {
        $this->settings = $this->getGoogleSettings();
        $this->service = $this->createGoogleCalService();
    }

    function getGoogleSettings() {
        $f = file(GOOGLE_SETTINGS_FILENAME);
        $g = new StdClass();
        if($f != FALSE) {
            $g->user = $f[0]; // Row 1: Username
            $g->pass = $f[1]; // Row 2: passwd
            $g->calendar = $f[2]; // Row 3: calendar address
            $g->client = $f[3];
            $g->serviceaccount = $f[4];
            $g->keyfile = $f[5];
        }
        return $g;
    }

    function createGoogleCalService() {
        $google = $this->settings;

        $client_id = trim($google->client);
        $service_account_name = trim($google->serviceaccount);
        $key_file_location = trim($google->keyfile);

        $client = new Google_Client();
        $client->setApplicationName("tellstick");
        $service = new Google_Service_Calendar($client);

        if (isset($_SESSION['service_token'])) {
            $client->setAccessToken($_SESSION['service_token']);
        }
        $key = file_get_contents($key_file_location);
        $cred = new Google_Auth_AssertionCredentials(
            $service_account_name,
            array('https://www.googleapis.com/auth/calendar'),
            $key
        );
        $client->setAssertionCredentials($cred);
        if ($client->getAuth()->isAccessTokenExpired()) {
            $client->getAuth()->refreshTokenWithAssertion($cred);
        }
        $_SESSION['service_token'] = $client->getAccessToken();

        return $service;
    }

    function getNextEvents() {
        $cal = trim($this->settings->calendar);

        // https://developers.google.com/google-apps/calendar/v3/reference/events/list
        $startTime = date(DateTime::ATOM);
        $endTime = date(DateTime::ATOM, time()+(2 * 24 * 60 * 60));
        $optParams = array('timeMin' => $startTime,
            'timeMax' => $endTime,
            'singleEvents' => "true",
            'orderBy' => "startTime");

        $events = $this->service->events->listEvents($cal, $optParams);

        $items = $events->items;
        // print_r($items);
        return $items;
    }

}

?>
