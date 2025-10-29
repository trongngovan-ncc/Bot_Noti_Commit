# Sử dụng image chính thức của Ollama
FROM ollama/ollama:latest

# Đặt biến môi trường để Ollama lắng nghe trên tất cả các network interface
# Điều này rất quan trọng để các service khác trên Render có thể kết nối vào
ENV OLLAMA_HOST=0.0.0.0

# Expose port mà Ollama sử dụng
EXPOSE 11434

# Khi container khởi động, chạy Ollama và tải trước model của bạn
CMD ["sh", "-c", "ollama serve & ollama run gemma3:4b-it-qat & wait"]