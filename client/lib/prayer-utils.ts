import {
  CalculationMethod,
  CalculationParameters,
  HighLatitudeRule,
} from "adhan";

type CalculationContext = {
  countryName?: string;
  latitude?: number;
};

function isUnitedKingdomOrIreland(countryName?: string): boolean {
  const country = countryName?.toLowerCase() ?? "";
  return (
    country.includes("united kingdom") ||
    country.includes("uk") ||
    country.includes("england") ||
    country.includes("scotland") ||
    country.includes("wales") ||
    country.includes("northern ireland") ||
    country.includes("ireland")
  );
}

function isHighLatitude(latitude?: number): boolean {
  return typeof latitude === "number" && Math.abs(latitude) >= 48;
}

function applyHighLatitudeRule(
  params: CalculationParameters,
  context?: CalculationContext,
): CalculationParameters {
  if (isHighLatitude(context?.latitude)) {
    params.highLatitudeRule = HighLatitudeRule.SeventhOfTheNight;
  }
  return params;
}

export function getCalculationMethod(
  methodName: string,
  context?: CalculationContext,
): CalculationParameters {
  if (
    methodName === "MuslimWorldLeague" &&
    isUnitedKingdomOrIreland(context?.countryName)
  ) {
    return applyHighLatitudeRule(
      CalculationMethod.MoonsightingCommittee(),
      context,
    );
  }

  let params: CalculationParameters;
  switch (methodName) {
    case "UmmAlQura":
      params = CalculationMethod.UmmAlQura();
      break;
    case "Egyptian":
      params = CalculationMethod.Egyptian();
      break;
    case "Karachi":
      params = CalculationMethod.Karachi();
      break;
    case "Tehran":
      params = CalculationMethod.Tehran();
      break;
    case "NorthAmerica":
      params = CalculationMethod.NorthAmerica();
      break;
    case "Kuwait":
      params = CalculationMethod.Kuwait();
      break;
    case "Qatar":
      params = CalculationMethod.Qatar();
      break;
    case "Singapore":
      params = CalculationMethod.Singapore();
      break;
    case "Turkey":
      params = CalculationMethod.Turkey();
      break;
    case "Dubai":
      params = CalculationMethod.Dubai();
      break;
    case "MoonsightingCommittee":
      params = CalculationMethod.MoonsightingCommittee();
      break;
    case "MuslimWorldLeague":
    default:
      params = CalculationMethod.MuslimWorldLeague();
      break;
  }
  return applyHighLatitudeRule(params, context);
}
