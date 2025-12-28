export const initialRoutes = [
    {
        originId: "bkk-airport",
        destinationId: "pattaya",
        origin: "Suvarnabhumi Airport (BKK)", // Keep for fallback/display
        destination: "Pattaya",
        prices: {
            sedan: 1500,
            suv: 1800,
            van: 2200,
            luxury: 5500,
            minibus: 2800
        },
        isActive: true
    },
    {
        originId: "dmk-airport",
        destinationId: "pattaya",
        origin: "Don Mueang Airport (DMK)",
        destination: "Pattaya",
        prices: {
            sedan: 1800,
            suv: 2000,
            van: 2500,
            luxury: 6000,
            minibus: 3000
        },
        isActive: true
    },
    {
        originId: "bkk-airport",
        destinationId: "hua-hin",
        origin: "Suvarnabhumi Airport (BKK)",
        destination: "Hua Hin",
        prices: {
            sedan: 2500,
            suv: 2800,
            van: 3200,
            luxury: 7500,
            minibus: 3800
        },
        isActive: true
    },
    {
        originId: "bangkok",
        destinationId: "pattaya",
        origin: "Bangkok City Center",
        destination: "Pattaya",
        prices: {
            sedan: 1400,
            suv: 1700,
            van: 2000,
            luxury: 5000,
            minibus: 2500
        },
        isActive: true
    },
    {
        originId: "bangkok",
        destinationId: "hua-hin",
        origin: "Bangkok City Center",
        destination: "Hua Hin",
        prices: {
            sedan: 2400,
            suv: 2700,
            van: 3000,
            luxury: 7000,
            minibus: 3500
        },
        isActive: true
    },
    {
        originId: "bkk-airport",
        destinationId: "bangkok",
        origin: "Suvarnabhumi Airport (BKK)",
        destination: "Bangkok City Center",
        prices: {
            sedan: 800,
            suv: 1000,
            van: 1200,
            luxury: 3000,
            minibus: 1500
        },
        isActive: true
    }
];
