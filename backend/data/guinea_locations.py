# Guinea administrative divisions: Communes and their Quartiers
GUINEA_LOCATIONS = {
    "Conakry": {
        "Kaloum": ["Boulbinet", "Coronthie", "Sandervalia", "Temenetaye", "Tombo", "Manquepas", "Sans Fil"],
        "Dixinn": ["Belle Vue", "Cameroun", "Dixinn Port", "Hafia Miniere", "Landreah", "Dixinn Centre", "Kenien"],
        "Matam": ["Boussoura", "Carriere", "Madina", "Matam", "Bonfi", "Hermakono", "Sandervalia", "Mafanco"],
        "Ratoma": ["Kaporo", "Kipé", "Nongo", "Ratoma Centre", "Cosa", "Taouyah", "Dar Es Salam", "Hamdallaye", "Lambanyi", "Kobaya", "Sonfonia", "Koloma"],
        "Matoto": ["Matoto Centre", "Dabompa", "Enta", "Kissosso", "Sangoyah", "Tanene", "Yimbaya", "Tombolia", "Simbaya", "Gbessia"],
    },
    "Kindia": {
        "Kindia Centre": ["Wondy", "Tafory", "Koliagbe", "Damakania"],
        "Mambia": ["Mambia Centre", "Kouressi"],
        "Manquepas": ["Manquepas Centre"],
        "Samaya": ["Samaya Centre"],
    },
    "Labe": {
        "Labe Centre": ["Tata", "Daka", "Kouroula", "Porédaka"],
        "Sannou": ["Sannou Centre"],
        "Hafia": ["Hafia Centre"],
        "Saala": ["Saala Centre"],
    },
    "Kankan": {
        "Kankan Centre": ["Kabada", "Bate Nafadji", "Salamankoto", "Timbo", "Djélibakoro"],
        "Tokounou": ["Tokounou Centre"],
        "Bordo": ["Bordo Centre"],
    },
    "Boke": {
        "Boke Centre": ["Bintimodia", "Diguifara", "Taïdy"],
        "Kamsar": ["Kamsar Port", "Kamsar Cité", "Filima"],
        "Kolaboui": ["Kolaboui Centre"],
    },
    "Mamou": {
        "Mamou Centre": ["Petel", "Saramoussayah", "Bouliwel"],
        "Timbo": ["Timbo Centre"],
        "Porédaka": ["Porédaka Centre"],
    },
    "Faranah": {
        "Faranah Centre": ["Banian", "Tiro", "Hérémakono"],
        "Dabola": ["Dabola Centre"],
        "Kissidougou": ["Kissidougou Centre"],
    },
    "N'Zerekore": {
        "N'Zerekore Centre": ["Bellevue", "Gonia", "Nyen", "Mohomou"],
        "Gueckedou": ["Gueckedou Centre"],
        "Macenta": ["Macenta Centre"],
    },
}


def get_cities():
    return list(GUINEA_LOCATIONS.keys())


def get_communes(city):
    return list(GUINEA_LOCATIONS.get(city, {}).keys())


def get_quartiers(city, commune):
    return GUINEA_LOCATIONS.get(city, {}).get(commune, [])
