import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// URL de descoberta de chaves do Microsoft Entra ID para o seu tenant
const jwksUri = 'https://login.microsoftonline.com/c580bd4a-fb89-4bde-b6ae-715befa1ab31/discovery/v2.0/keys';

const client = jwksClient({
  jwksUri: jwksUri,
  cache: true, // Habilita cache para evitar buscas repetidas
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 60 * 1000, // 10 horas
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('Erro ao obter chave de assinatura:', err);
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export function verifyToken(token: string): Promise<jwt.JwtPayload | undefined> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      algorithms: ['RS256'], // Algoritmo usado pelo Entra ID
      // O audience e issuer devem corresponder ao que está no seu token
      // Audience é geralmente o Client ID da sua aplicação
      audience: 'df5b2c78-c26b-47ae-aa8c-86dab74752fb',
      // Issuer é a URL do seu tenant
      issuer: 'https://login.microsoftonline.com/c580bd4a-fb89-4bde-b6ae-715befa1ab31/v2.0',
    }, (err, decoded) => {
      if (err) {
        return reject(err);
      }
      resolve(decoded as jwt.JwtPayload | undefined);
    });
  });
}
