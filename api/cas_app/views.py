from django.shortcuts import render
from django.shortcuts import render, redirect
from .models import *
from rest_framework.decorators import api_view,permission_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from .models import *
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.mail import send_mail
from django.conf import settings
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode 
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from rest_framework_simplejwt.tokens import RefreshToken

from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import *  # Ensure correct import path
from rest_framework.views import APIView
# Create your views here.

def home(request):
    return render(request, 'home.html')

@api_view(['POST'])
def user_login(request):
    if request.method != "POST":
        return Response({"detail": "This view only handles POST requests."}, status=status.HTTP_400_BAD_REQUEST)

    identifier = request.data.get('username') or request.data.get('email')
    password = request.data.get('password')
    if not identifier or not password:
        return Response("Email and/or Password are Incorrect", status=status.HTTP_400_BAD_REQUEST)

    # Try authenticating directly as username
    user = authenticate(request, username=identifier, password=password)
    print(user)
    # If that fails, try resolving identifier as email to a username
    if user is None and '@' in identifier:
        try:
            resolved_user = User.objects.get(email=identifier)
            user = authenticate(request, username=resolved_user.username, password=password)
        except User.DoesNotExist:
            user = None
    if user is not None:
        login(request, user)
        print(user)
        # Generate JWT token
        refresh = RefreshToken.for_user(user)   
        # Create a custom response with the token
        response_data = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user_id': user.id,
            'role': user.groups.first().name if user.groups.exists() else 'Citizen',  # Assuming first group is the role
        }
        return Response(response_data, status=status.HTTP_200_OK)
        # # Here, we use our CustomTokenObtainPairSerializer to handle token creation
        # serializer = CustomTokenObtainPairSerializer(data=request.data)
        
        # # Validate the serializer to trigger our custom token generation logic
        # if serializer.is_valid():
        #     # Serializer is now using the overridden validate method, so it returns our custom response
        #     return Response(serializer.validated_data, status=status.HTTP_200_OK)
        # else:
        #  s   return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({"detail": "Invalid login credentials."}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET']) # Ensures that this view can only be accessed via a POST request for security
def logout_view(request):
    logout(request)
    return Response({'message': 'logged out successfully.'}, status=status.HTTP_200_OK)


#change password function
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    data = request.data
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    if not old_password or not new_password:
        return Response({'error': 'Both old and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if the old password is correct
    if not user.check_password(old_password):
        return Response({'error': 'Old password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
    
    else:
        # Set the new password
        user.set_password(new_password)
        user.save()

        return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)

#forget password function  
@api_view(['POST'])
def forget_password(request):
    if request.method == "POST":
        headers = request.data

        print(headers)
        email = headers.get('email')  # Assuming the key is 'email' in the received data

        try:
            user = User.objects.get(username=email)
            #user_profile = UserProfile.objects.get(user=user)
            if user is not None and user.is_active and user.is_deleted != True:
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                password_reset_url = f"http://localhost:3000/changepassword/{uid}/{token}"
                
                print(password_reset_url)
                send_mail(
                    'Password Reset Request',
                    f'Please click on the link to reset your password: {password_reset_url}',
                    settings.EMAIL_HOST_USER,
                    [email],
                    fail_silently=False,
                )

                return Response({'message': 'Password reset link sent to your email'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User with this email does not exist'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({'error': 'Only POST method is allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(['POST'])
def reset_password(request):
    uidb64 = request.data.get("userId")
    token = request.data.get("token")
    
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)

        if default_token_generator.check_token(user, token):
            # Assuming new password is sent in request.data
            new_password = request.data.get('newPassword')
            user.set_password(new_password)
            user.save()
            print("doneeeeeeeeeeeeeeee")
            return Response({'message': 'Password has been reset.'})
        else:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)
