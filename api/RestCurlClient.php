<?php

class HttpServerException extends Exception
{

}

class HttpServerException404 extends Exception
{

  function __construct($message = 'Not Found')
  {
    parent::__construct($message, 404);
  }

}

class RestClientException extends Exception
{

}

class RestCurlClient
{

  public $headers;
  public $base_url;
  public $handle;
  public $http_options;
  public $response_object;
  public $response_info;
  public $resultWithToken;

  function __construct($headers, $base_url)
  {
    $this->base_url = $base_url;
    $this->headers = $headers;
  }

  /**
   * Init A curl object for WS authentication
   * Get an authentication token
   */
  function initCurl()
  {
    $curlCookieJar = tempnam(sys_get_temp_dir(), "cookies_");

    $this->http_options = array();
    $this->http_options[CURLOPT_HTTPHEADER] = $this->headers;
    $this->http_options[CURLOPT_RETURNTRANSFER] = true;
    $this->http_options[CURLOPT_FOLLOWLOCATION] = false;
    $this->http_options[CURLOPT_COOKIESESSION] = false;
    $this->http_options[CURLOPT_COOKIEJAR] = $curlCookieJar;
    $this->http_options[CURLOPT_COOKIEFILE] = $curlCookieJar;
    $this->http_options[CURLOPT_HEADER] = false;
    $this->http_options[CURLOPT_CONNECTTIMEOUT] = 1;
    $this->http_options[CURLOPT_TIMEOUT] = 30;
    $this->http_options[CURLOPT_URL] = $this->base_url . '/ws/token';
    $this->http_options[CURLOPT_CUSTOMREQUEST] = 'POST';
    $this->http_options[CURLOPT_POSTFIELDS] = json_encode(
        array(
            'grant_type' => 'client_credentials'
        )
    );

    $this->handle = curl_init();
    curl_setopt_array($this->handle, $this->http_options);
    $this->resultWithToken = json_decode(curl_exec($this->handle));

    $this->http_options[CURLOPT_HTTPHEADER] = array(
        'Authorization: Bearer ' . $this->resultWithToken->access_token
    );
//    curl_setopt($this->handle, CURLOPT_HTTPHEADER,
//        array(
//        'Authorization: Bearer ' . $this->resultWithToken->access_token
//    ));
  }

  /**
   * Curl execution.
   * Curl object is destroy after a call
   */
  function execCurl()
  {
    if ($this->handle)
    {
      $this->response_object = curl_exec($this->handle);
      curl_close($this->handle);
    }
  }

  /**
   * Perform a GET call to server
   *
   * Additionaly in $response_object and $response_info are the
   * response from server and the response info as it is returned
   * by curl_exec() and curl_getinfo() respectively.
   *
   * @param string $url The url to make the call to.
   * @param array $http_options Extra option to pass to curl handle.
   * @return string The response from curl if any
   */
  function get($url, $http_options = array())
  {
    $this->initCurl();
    $http_options = $http_options + $this->http_options;
    $http_options[CURLOPT_CUSTOMREQUEST] = 'GET';
    $http_options[CURLOPT_URL] = $url;

    if (!curl_setopt_array($this->handle, $http_options))
    {
      throw new RestClientException("Error setting cURL request options");
    }
    $this->execCurl();
    return $this->response_object;
  }

  /**
   * Perform a POST call to the server
   *
   * Additionaly in $response_object and $response_info are the
   * response from server and the response info as it is returned
   * by curl_exec() and curl_getinfo() respectively.
   *
   * @param string $url The url to make the call to.
   * @param string|array The data to post. Pass an array to make a http form post.
   * @param array $http_options Extra option to pass to curl handle.
   * @return string The response from curl if any
   */
  function post($url, $fields = array(), $http_options = array())
  {
    $this->initCurl();
    $http_options = $http_options + $this->http_options;
    $http_options[CURLOPT_POST] = true;
    $http_options[CURLOPT_URL] = $url;
    $http_options[CURLOPT_POSTFIELDS] = $fields;
    if (is_array($fields))
    {
      $http_options[CURLOPT_HTTPHEADER] = array(
          'Content-Type: multipart/form-data');
    }
    if (!curl_setopt_array($this->handle, $http_options))
    {
      throw new RestClientException("Error setting cURL request options.");
    }
    $this->execCurl();
    return $this->response_object;
  }

  /**
   * Perform a PUT call to the server
   *
   * Additionaly in $response_object and $response_info are the
   * response from server and the response info as it is returned
   * by curl_exec() and curl_getinfo() respectively.
   *
   * @param string $url The url to make the call to.
   * @param string|array The data to post.
   * @param array $http_options Extra option to pass to curl handle.
   * @return string The response from curl if any
   */
  function put($url, $data = '', $http_options = array())
  {
    $this->initCurl();
    $http_options = $http_options + $this->http_options;
    $http_options[CURLOPT_CUSTOMREQUEST] = 'PUT';
    $http_options[CURLOPT_POSTFIELDS] = $data;
    $http_options[CURLOPT_URL] = $url;
    if (!curl_setopt_array($this->handle, $http_options))
    {
      throw new RestClientException("Error setting cURL request options.");
    }
    $this->execCurl();
    return $this->response_object;
  }

  /**
   * Perform a DELETE call to server
   *
   * Additionaly in $response_object and $response_info are the
   * response from server and the response info as it is returned
   * by curl_exec() and curl_getinfo() respectively.
   *
   * @param string $url The url to make the call to.
   * @param array $http_options Extra option to pass to curl handle.
   * @return string The response from curl if any
   */
  function delete($url, $http_options = array())
  {
    $this->initCurl();
    $http_options = $http_options + $this->http_options;
    $http_options[CURLOPT_CUSTOMREQUEST] = 'DELETE';
    $http_options[CURLOPT_URL] = $url;
    if (!curl_setopt_array($this->handle, $http_options))
    {
      throw new RestClientException("Error setting cURL request options.");
    }
    $this->execCurl();
    return $this->response_object;
  }

}
