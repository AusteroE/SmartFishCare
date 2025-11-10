# Server Optimization Guide

## Web Performance Optimizations

The server is optimized for web use with the following features:

### 1. Image Resizing
- Large images (>1280px) are automatically resized
- Reduces processing time and memory usage
- Configurable via `MAX_IMAGE_SIZE` environment variable

### 2. Model Warming
- Model is pre-loaded and warmed up on startup
- First request is fast (no model loading delay)
- Dummy inference runs during startup

### 3. Session Optimization
- GPU memory growth enabled (efficient memory usage)
- Thread parallelism optimized for web requests
- Device placement logging disabled (performance)

### 4. Caching
- Model loaded once, reused for all requests
- No repeated model loading overhead
- Efficient memory usage

### 5. Error Handling
- Graceful error handling
- Timeout protection (10 seconds)
- Automatic fallback to custom detection

## Performance Tuning

### Adjust Image Size

```bash
# Smaller images = faster processing
export MAX_IMAGE_SIZE=640

# Larger images = better accuracy (slower)
export MAX_IMAGE_SIZE=1920
```

### Adjust Confidence Threshold

```bash
# Lower threshold = more detections (may include false positives)
export CONFIDENCE_THRESHOLD=0.2

# Higher threshold = fewer detections (more accurate)
export CONFIDENCE_THRESHOLD=0.5
```

### Thread Configuration

Edit `fish_detection_server.py`:

```python
config.inter_op_parallelism_threads = 4  # Increase for more concurrent requests
config.intra_op_parallelism_threads = 4  # Increase for faster single requests
```

## Monitoring

### Check Processing Time

The server logs processing time for each request:
```
Detection completed: 3 fish found in 45.2ms
```

### Check Server Health

```bash
curl http://localhost:5000/health
```

### Check Model Info

```bash
curl http://localhost:5000/model/info
```

## Optimization Tips

1. **Use GPU**: If available, GPU significantly speeds up inference
2. **Reduce Image Size**: Smaller images process faster
3. **Adjust Threshold**: Balance accuracy vs speed
4. **Monitor Performance**: Check processing times in logs
5. **Scale Horizontally**: Run multiple server instances for high load

## Expected Performance

- **First Request**: ~500-1000ms (includes warmup)
- **Subsequent Requests**: ~40-100ms per image
- **Large Images**: Automatically optimized (resized if >1280px)
- **Concurrent Requests**: Handled efficiently with threading

## Troubleshooting

### Slow Performance

- Check if GPU is available and being used
- Reduce `MAX_IMAGE_SIZE`
- Increase thread counts
- Check system resources (CPU, memory)

### High Memory Usage

- Reduce `MAX_IMAGE_SIZE`
- Limit concurrent requests
- Use GPU if available (more efficient)

### Timeout Issues

- Increase timeout in client (currently 10 seconds)
- Reduce image size
- Optimize model (use smaller model variant)

