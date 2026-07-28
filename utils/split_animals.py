import os
from PIL import Image

def taglia_griglia_immagini(percorso_immagine, cartella_output):
    """
    Prende un'immagine 1500x1500px e la taglia in 900 immagini 50x50px,
    salvandole nella cartella specificata.
    """
    # Crea la cartella di destinazione se non esiste
    if not os.path.exists(cartella_output):
        os.makedirs(cartella_output)

    # Apre l'immagine sorgente
    try:
        img = Image.open(percorso_immagine)
    except FileNotFoundError:
        print(f"Errore: Impossibile trovare l'immagine al percorso '{percorso_immagine}'.")
        return

    # Dimensioni attese
    tile_size = 51.15
    righe = 15
    colonne = 20
    crop_margin = 3  # Numero di pixel da rimuovere da ogni lato del ritaglio   
    count = 0

    # Ciclo attraverso righe e colonne
    for r in range(righe):
        for c in range(colonne):
            # Calcola le coordinate del riquadro di taglio: (left, top, right, bottom)
            left = c * tile_size
            top = r * tile_size
            right = left + tile_size
            bottom = top + tile_size

            # Effettua il ritaglio
            ritaglio = img.crop((left, top, right, bottom))
              # Rimuove 2 pixel da ogni lato
            ritaglio = img.crop((
                left + crop_margin,
                top + crop_margin,
                right - crop_margin,
                bottom - crop_margin
            ))

            # Ridimensiona a 50x50 pixel
            ritaglio = ritaglio.resize((50, 50), Image.Resampling.LANCZOS)

            # Nome file formattato a 3 cifre (es. animale_001.png, animale_002.png...)
            nome_file = f"animale_{count + 1:03d}.png"
            percorso_salvataggio = os.path.join(cartella_output, nome_file)



            # Salva in formato PNG
            ritaglio.save(percorso_salvataggio, "PNG")
            count += 1

    print(f"Operazione completata! Salvate {count} immagini in '{cartella_output}'.")

if __name__ == "__main__":


    # Ottiene la lista di file e cartelle nella directory corrente ('.')
    elementi = os.listdir('.')

    print("Contenuto della cartella corrente:")
    for elemento in elementi:
        print(f"- {elemento}")
    # Inserisci qui il nome o il percorso della tua immagine scaricata
    IMMAGINE_INPUT = "backend/app/post/animal_grid.png" 
    CARTELLA_DESTINAZIONE = "backend/app/post/animal_50x50"

    taglia_griglia_immagini(IMMAGINE_INPUT, CARTELLA_DESTINAZIONE)