import os
from PIL import Image

def split_image_grid(source_image_path, output_folder):
    """
    Takes a 1500x1500px image and cuts it into 300 tiles of 50x50px,
    saving them into the specified output folder.
    """
    # Create the destination folder if it does not exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Open the source image
    try:
        img = Image.open(source_image_path)
    except FileNotFoundError:
        print(f"Error: could not find the image at path '{source_image_path}'.")
        return

    # Expected dimensions
    tile_size = 51.15
    rows = 15
    columns = 20
    crop_margin = 3  # Number of pixels to trim off each side of the crop
    count = 0

    # Loop through rows and columns
    for r in range(rows):
        for c in range(columns):
            # Compute the crop box coordinates: (left, top, right, bottom)
            left = c * tile_size
            top = r * tile_size
            right = left + tile_size
            bottom = top + tile_size

            # Trim a few pixels off each side of the crop
            tile = img.crop((
                left + crop_margin,
                top + crop_margin,
                right - crop_margin,
                bottom - crop_margin
            ))

            # Resize to 50x50 pixels
            tile = tile.resize((50, 50), Image.Resampling.LANCZOS)

            # File name formatted with 3 digits (e.g. animal_001.png, animal_002.png...)
            file_name = f"animal_{count + 1:03d}.png"
            save_path = os.path.join(output_folder, file_name)

            # Save as PNG
            tile.save(save_path, "PNG")
            count += 1

    print(f"Done! Saved {count} images to '{output_folder}'.")

if __name__ == "__main__":
    # List files and folders in the current directory ('.')
    entries = os.listdir('.')

    print("Contents of the current folder:")
    for entry in entries:
        print(f"- {entry}")

    # Set the path to your downloaded sprite sheet image here
    INPUT_IMAGE = "frontend/src/img/animal_grid.png"
    OUTPUT_FOLDER = "frontend/src/img/animal_50x50"

    split_image_grid(INPUT_IMAGE, OUTPUT_FOLDER)