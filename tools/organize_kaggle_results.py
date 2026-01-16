"""
Organize Kaggle Training Results
Automatically move downloaded files to correct directories
"""

import os
import shutil
from pathlib import Path

def organize_kaggle_results(download_dir):
    """
    Organize downloaded Kaggle results into proper directory structure
    
    Expected download structure:
    downloads/
    ├── results/
    │   └── outputs/
    │       ├── *.json
    │       ├── *.csv
    │       ├── *.h5
    │       └── samples/*.wav
    
    Target structure:
    backend/
    ├── models/
    │   └── *.h5
    └── outputs/
        ├── *.json
        ├── *.csv
        └── samples/*.wav
    """
    
    print("🚀 Starting Kaggle Results Organization...")
    
    # Paths
    download_path = Path(download_dir)
    outputs_source = download_path / "outputs"
    
    backend_root = Path("backend")
    models_target = backend_root / "models"
    outputs_target = backend_root / "outputs"
    samples_target = outputs_target / "samples"
    
    # Create target directories
    models_target.mkdir(parents=True, exist_ok=True)
    outputs_target.mkdir(parents=True, exist_ok=True)
    samples_target.mkdir(parents=True, exist_ok=True)
    
    if not outputs_source.exists():
        print(f"❌ Error: {outputs_source} not found!")
        print(f"   Please ensure you've downloaded and extracted Kaggle results to {download_dir}")
        return
    
    # Counters
    moved_models = 0
    moved_json = 0
    moved_csv = 0
    moved_samples = 0
    
    # 1. Move .h5 model files
    print("\n📦 Moving model files (.h5) to backend/models/...")
    for h5_file in outputs_source.glob("*.h5"):
        target = models_target / h5_file.name
        shutil.copy2(h5_file, target)
        print(f"   ✅ {h5_file.name} → models/ ({h5_file.stat().st_size / 1024 / 1024:.2f} MB)")
        moved_models += 1
    
    if moved_models == 0:
        print("   ⚠️  No .h5 model files found in source directory")
    
    # 2. Move JSON files
    print("\n📄 Moving JSON files...")
    for json_file in outputs_source.glob("*.json"):
        # SKIP eda_samples.json as it is managed by separate tools
        if json_file.name == "eda_samples.json":
            print(f"   ⏩ Skipping {json_file.name} (Preserving existing EDA samples)")
            continue
            
        target = outputs_target / json_file.name
        shutil.copy2(json_file, target)
        print(f"   ✅ {json_file.name} → outputs/")
        moved_json += 1
    
    # 3. Move CSV files
    print("\n📊 Moving CSV history files...")
    for csv_file in outputs_source.glob("*.csv"):
        target = outputs_target / csv_file.name
        shutil.copy2(csv_file, target)
        print(f"   ✅ {csv_file.name} → outputs/")
        moved_csv += 1
    
    # 4. SKIP Condition: Samples are managed by generate/curate_eda_samples.py
    # samples_source = outputs_source / "samples"
    # if samples_source.exists():
    #     print("\n🎵 Moving audio samples...")
    #     for wav_file in samples_source.glob("*.wav"):
    #         target = samples_target / wav_file.name
    #         shutil.copy2(wav_file, target)
    #         print(f"   ✅ {wav_file.name} → outputs/samples/")
    #         moved_samples += 1
    print("\n⏩ Skipping Samples Folder (Preserving curating EDA samples)")
    
    # Summary
    print("\n" + "="*60)
    print("✅ Organization Complete!")
    print("="*60)
    print(f"📦 Models moved: {moved_models}")
    print(f"📄 JSON files moved: {moved_json}")
    print(f"📊 CSV files moved: {moved_csv}")
    print(f"🎵 Audio samples moved: {moved_samples}")
    print("\n🎯 Next Steps:")
    print("1. Restart backend: uvicorn app_api:app --reload")
    print("2. Refresh frontend browser")
    print("3. Check Dashboard - data should auto-populate!")

if __name__ == "__main__":
    import sys
    
    # Default download directory
    default_dir = os.path.expanduser("~/Downloads/results")
    
    if len(sys.argv) > 1:
        download_dir = sys.argv[1]
    else:
        download_dir = default_dir
        print(f"Using default download directory: {download_dir}")
        print(f"(You can specify custom path: python organize_kaggle_results.py <path>)")
    
    organize_kaggle_results(download_dir)
