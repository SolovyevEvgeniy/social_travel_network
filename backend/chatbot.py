from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

class TravelChatbot:
    def __init__(self):
        self.model_name = "microsoft/DialoGPT-small"  # Используем легкую модель для начала
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
        
    async def get_response(self, user_input: str) -> str:
        # Подготавливаем контекст для путешествий
        travel_context = "You are a helpful travel assistant. "
        
        # Токенизируем входные данные
        inputs = self.tokenizer.encode(travel_context + user_input + self.tokenizer.eos_token, return_tensors='pt')
        
        # Генерируем ответ
        reply_ids = self.model.generate(
            inputs,
            max_length=1000,
            pad_token_id=self.tokenizer.eos_token_id,
            no_repeat_ngram_size=3,
            do_sample=True,
            top_k=100,
            top_p=0.7,
            temperature=0.8
        )
        
        # Декодируем ответ
        response = self.tokenizer.decode(reply_ids[0], skip_special_tokens=True)
        return response 