package com.example.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import javax.net.ssl.*;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.security.cert.X509Certificate;

/**
 * Configuración del cliente HTTP (RestTemplate) con soporte para certificados SSL/TLS
 * en entornos corporativos o redes con inspección SSL (evita PKIX path building failed).
 */
@Configuration
public class RestClientConfig {

    @Bean
    public RestTemplate restTemplate() {
        try {
            TrustManager[] trustAllCerts = new TrustManager[]{
                new X509TrustManager() {
                    public X509Certificate[] getAcceptedIssuers() { return null; }
                    public void checkClientTrusted(X509Certificate[] certs, String authType) {}
                    public void checkServerTrusted(X509Certificate[] certs, String authType) {}
                }
            };

            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
            HttpsURLConnection.setDefaultSSLSocketFactory(sslContext.getSocketFactory());
            HttpsURLConnection.setDefaultHostnameVerifier((hostname, session) -> true);

            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
                @Override
                protected void prepareConnection(HttpURLConnection connection, String httpMethod) throws IOException {
                    if (connection instanceof HttpsURLConnection httpsURLConnection) {
                        httpsURLConnection.setSSLSocketFactory(sslContext.getSocketFactory());
                        httpsURLConnection.setHostnameVerifier((hostname, session) -> true);
                    }
                    super.prepareConnection(connection, httpMethod);
                }
            };
            factory.setConnectTimeout(15000);
            factory.setReadTimeout(20000);

            return new RestTemplate(factory);
        } catch (Exception e) {
            System.err.println("Error configurando SSL en RestTemplate: " + e.getMessage());
            return new RestTemplate();
        }
    }
}
