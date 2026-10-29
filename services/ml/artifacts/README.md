# ML Artifacts Directory
This directory stores serialized model artifacts and evaluation metrics.
- `evaluation_metrics.json`: Performance benchmark results (MAE, RMSE, R²).
- `model_v1.joblib`: Serialized trained pipeline containing the preprocessor and Random Forest Regressor.
To train a fresh model:
  python services/ml/scripts/train_model.py
