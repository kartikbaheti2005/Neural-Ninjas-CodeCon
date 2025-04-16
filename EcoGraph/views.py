from django.shortcuts import render

def home(request):
    return render(request, 'home.html')

def about(request):
    return render(request, 'about.html')

def details(request):
    return render(request, 'details.html')


def login(request):
    return render(request, 'login.html')

def register(request):
    return render(request, 'register.html')

def front(request):
    return render(request, 'front.html')