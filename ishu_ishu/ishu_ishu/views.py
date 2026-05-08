# views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import JsonResponse

@api_view(['POST'])
def register(request):
    return Response({"message": "user created"})

def home(request):
    return JsonResponse({"message": "API works"})


