import { describe, expect, it } from 'vitest';
import {
  isDomestic,
  isRelayAvailable,
  normalizeCountryCode,
  requiresCn23,
  resolveHomeProductCode,
  validateZip,
  getCountryOptions,
  countryFlag,
  searchableLabel,
} from '@/lib/colissimo-countries';
import { computeShippingCost, type CheckoutConfig } from '@/hooks/useCheckoutConfig';

/**
 * Ces tests verrouillent les règles arbitrées le 14/09/2026 : ce sont elles qui
 * ont débloqué les expéditions hors France (COLISSIMO_ARBITRAGE.md). Chaque cas
 * correspond à une commande réellement bloquée.
 */

const config: CheckoutConfig = {
  shippingHomePrice: 15,
  shippingRelayPrice: 4.5,
  freeShippingThreshold: 99,
  freeShippingRelayOnly: true,
  homeDeliveryEnabled: true,
  relayEnabled: true,
  paymentMethods: [],
  checkoutMessage: '',
  relayMapSettings: {
    markerColor: '#000',
    selectedMarkerColor: '#fff',
    tileStyle: 'standard',
    defaultZoom: 13,
    searchRadius: 10,
  },
  autoColissimoLabel: true,
  internationalShippingPrice: 40,
};

describe('normalizeCountryCode', () => {
  it('accepte les codes ISO', () => {
    expect(normalizeCountryCode('CH')).toBe('CH');
    expect(normalizeCountryCode('ch')).toBe('CH');
  });

  it("reconnaît les libellés de l'historique, écrits en toutes lettres", () => {
    // Le checkout écrivait « France » en dur avant le 14/09/2026, et
    // l'administration a corrigé quelques commandes en « Suisse ».
    expect(normalizeCountryCode('France')).toBe('FR');
    expect(normalizeCountryCode('Suisse')).toBe('CH');
  });

  it('retombe sur la France plutôt que d\'échouer', () => {
    expect(normalizeCountryCode('')).toBe('FR');
    expect(normalizeCountryCode(null)).toBe('FR');
    expect(normalizeCountryCode('Pays imaginaire')).toBe('FR');
  });
});

describe('code produit selon la destination', () => {
  it('garde DOM là où la livraison sans signature existe', () => {
    // Erreur d'analyse initiale : DOM avait été cru réservé à la France.
    expect(resolveHomeProductCode('FR')).toBe('DOM');
    expect(resolveHomeProductCode('CH')).toBe('DOM');
    expect(resolveHomeProductCode('BE')).toBe('DOM');
  });

  it('bascule sur DOS là où seule la signature est acceptée', () => {
    // C'est ce qui aurait bloqué la commande de Montréal même après
    // correction du pays.
    for (const country of ['DE', 'ES', 'IT', 'GB', 'US', 'CA']) {
      expect(resolveHomeProductCode(country)).toBe('DOS');
    }
  });

  it('utilise les codes propres aux DOM-TOM', () => {
    expect(resolveHomeProductCode('GP')).toBe('COM');
  });
});

describe('disponibilité du point relais', () => {
  it('existe en France et dans l\'UE proche', () => {
    expect(isRelayAvailable('FR')).toBe(true);
    expect(isRelayAvailable('BE')).toBe(true);
    expect(isRelayAvailable('DE')).toBe(true);
  });

  it("n'existe pas en Suisse, au Royaume-Uni, aux États-Unis ni au Canada", () => {
    for (const country of ['CH', 'GB', 'US', 'CA']) {
      expect(isRelayAvailable(country)).toBe(false);
    }
  });
});

describe('déclaration douanière', () => {
  it('est exigée hors UE', () => {
    for (const country of ['CH', 'GB', 'US', 'CA']) {
      expect(requiresCn23(country)).toBe(true);
    }
  });

  it("ne l'est pas à l'intérieur de l'UE", () => {
    for (const country of ['FR', 'BE', 'DE', 'ES', 'IT']) {
      expect(requiresCn23(country)).toBe(false);
    }
  });
});

describe('validateZip', () => {
  it('exige 5 chiffres en France', () => {
    expect(validateZip('75001', 'FR')).toBeNull();
    expect(validateZip('1541', 'FR')).not.toBeNull();
  });

  it('accepte les formats étrangers que la règle française rejetait', () => {
    // Les codes postaux des commandes bloquées : Suisse à 4 chiffres,
    // Canada alphanumérique.
    expect(validateZip('1541', 'CH')).toBeNull();
    expect(validateZip('2015', 'CH')).toBeNull();
    expect(validateZip('H2G 2Y6', 'CA')).toBeNull();
  });

  it('refuse un code postal vide', () => {
    expect(validateZip('', 'CH')).not.toBeNull();
  });
});

describe('computeShippingCost — forfait international', () => {
  it('applique le tarif France habituel', () => {
    expect(computeShippingCost(config, 50, 'home', 'FR')).toBe(15);
    expect(computeShippingCost(config, 50, 'relay', 'FR')).toBe(4.5);
  });

  it('offre le point relais au-delà du seuil, en France uniquement', () => {
    expect(computeShippingCost(config, 150, 'relay', 'FR')).toBe(0);
  });

  it('remplace les frais de port par le forfait hors France', () => {
    // 40 € tout compris, et non 15 + 40.
    expect(computeShippingCost(config, 50, 'home', 'CH')).toBe(40);
    expect(computeShippingCost(config, 50, 'relay', 'CH')).toBe(40);
  });

  it('ignore le franco de port hors France', () => {
    // HMP-MTVEO78Y : 214 € de panier. Avec le franco, l'envoi suisse serait
    // parti gratuitement — donc à perte.
    expect(computeShippingCost(config, 214, 'home', 'CH')).toBe(40);
    expect(computeShippingCost(config, 1000, 'relay', 'CA')).toBe(40);
  });

  it('applique le même forfait quel que soit le pays', () => {
    for (const country of ['CH', 'BE', 'CA', 'US', 'DE']) {
      expect(computeShippingCost(config, 120, 'home', country)).toBe(40);
    }
  });

  it('considère la France par défaut quand le pays est absent', () => {
    expect(computeShippingCost(config, 50, 'home')).toBe(15);
  });
});

describe('isDomestic', () => {
  it('ne reconnaît que la France', () => {
    expect(isDomestic('FR')).toBe(true);
    expect(isDomestic('CH')).toBe(false);
    expect(isDomestic(undefined)).toBe(true);
  });
});

describe('getCountryOptions', () => {
  it('place la France en tête et la Suisse juste après', () => {
    const options = getCountryOptions();
    expect(options[0].code).toBe('FR');
    expect(options[1].code).toBe('CH');
  });

  it('couvre toute la table Colissimo', () => {
    expect(getCountryOptions().length).toBeGreaterThan(200);
  });
});

describe('countryFlag', () => {
  it('dérive le drapeau du code ISO', () => {
    expect(countryFlag('FR')).toBe('🇫🇷');
    expect(countryFlag('CH')).toBe('🇨🇭');
    expect(countryFlag('ca')).toBe('🇨🇦');
  });

  it('retombe sur un globe pour une entrée invalide', () => {
    expect(countryFlag('')).toBe('🌍');
    expect(countryFlag('FRA')).toBe('🌍');
  });
});

describe('searchableLabel', () => {
  it('ignore accents et casse, pour que la recherche reste tolérante', () => {
    // « suede » doit trouver « Suède », « etats » trouver « États-Unis ».
    expect(searchableLabel('Suède')).toBe('suede');
    expect(searchableLabel('États-Unis')).toBe('etats-unis');
  });
});

describe('options du sélecteur de pays', () => {
  it('porte un drapeau et un rang de priorité', () => {
    const france = getCountryOptions().find(o => o.code === 'FR');
    expect(france?.flag).toBe('🇫🇷');
    expect(france?.priority).toBe(true);

    const suede = getCountryOptions().find(o => o.code === 'SE');
    expect(suede?.priority).toBe(false);
  });
});
