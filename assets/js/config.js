/* Configurazione del sito. Si carica prima degli altri script.
   newsletterEndpoint: l'indirizzo a cui spedire le iscrizioni alla "Benzina del lunedì" (POST JSON {email, lista, origine}).
   Vuoto = il modulo apre una mail alla redazione. Va bene un endpoint Formspree, Mailchimp, Brevo o un webhook proprio. */
window.FG_CONFIG = {
  newsletterEndpoint: ''
};
