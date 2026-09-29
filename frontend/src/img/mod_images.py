import os
import zipfile
import time
from rembg import remove
from PIL import Image

# Configurazione percorsi
zip_ingresso = "animal_50x50.zip"
zip_uscita = "animal_50x50_trasparente.zip"
cartella_temp = "immagini_estratte"

# 1. Estrazione del file ZIP originale
print("1/3 Estrazione file ZIP...")
with zipfile.ZipFile(zip_ingresso, 'r') as zip_ref:
    zip_ref.extractall(cartella_temp)

# Recupero della lista completa di immagini
lista_immagini = []
for root, _, files in os.walk(cartella_temp):
    for file in files:
        if file.lower().endswith(('.png', '.jpg', '.jpeg')):
            lista_immagini.append(os.path.join(root, file))

totale = len(lista_immagini)
print(f"Trovate {totale} immagini da elaborare.\n")

# 2. Rimozione sfondo con barra di avanzamento testuale
print("2/3 Elaborazione rimozione sfondo...")
tempo_inizio = time.time()

for i, percorso_file in enumerate(lista_immagini, start=1):
    nome_file = os.path.basename(percorso_file)
    percentuale = (i / totale) * 100
    
    # Stampa l'avanzamento aggiornando la stessa riga
    print(f"[{i}/{totale}] ({percentuale:.1f}%) Elaborazione: {nome_file}...", end="\r")

    # Elaborazione immagine
    input_img = Image.open(percorso_file)
    output_img = remove(input_img)
    output_img.save(percorso_file, "PNG")

tempo_totale = round(time.time() - tempo_inizio, 2)
print(f"\n\nElaborazione completata in {tempo_totale} secondi!")

# 3. Ricreazione del file ZIP
print("\n3/3 Creazione del nuovo file ZIP...")
with zipfile.ZipFile(zip_uscita, 'w', zipfile.ZIP_DEFLATED) as zip_out:
    for root, _, files in os.walk(cartella_temp):
        for file in files:
            percorso_file = os.path.join(root, file)
            nome_relativo = os.path.relpath(percorso_file, cartella_temp)
            zip_out.write(percorso_file, nome_relativo)

print(f"\nOperazione conclusa! File creato: '{zip_uscita}'")