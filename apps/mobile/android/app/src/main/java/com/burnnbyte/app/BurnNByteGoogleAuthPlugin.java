package com.burnnbyte.app;

import android.os.CancellationSignal;
import androidx.credentials.Credential;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

@CapacitorPlugin(name = "BurnNByteGoogleAuth")
public class BurnNByteGoogleAuthPlugin extends Plugin {
    private boolean signingIn = false;

    @PluginMethod
    public void signOut(PluginCall call) {
        CredentialManager.create(getContext()).clearCredentialStateAsync(
            new ClearCredentialStateRequest(), new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<Void, ClearCredentialException>() {
                @Override
                public void onResult(Void result) { call.resolve(); }
                @Override
                public void onError(ClearCredentialException error) {
                    call.reject("Unable to clear Google credential state.");
                }
            }
        );
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        // Native requests use the WEB client as token audience. The Android
        // OAuth client authorizes this package + Play signing certificate.
        String clientId = call.getString("clientId");
        String nonce = call.getString("nonce");
        if (clientId == null || nonce == null) {
            call.reject("Google sign-in configuration is missing.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (signingIn) {
                call.reject("Google sign-in is already in progress.");
                return;
            }
            signingIn = true;
            try {
                GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(clientId)
                    .setNonce(nonce).build();
                GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(option).build();
                CredentialManager.create(getContext()).getCredentialAsync(
                    getActivity(), request, new CancellationSignal(),
                    ContextCompat.getMainExecutor(getContext()),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override
                        public void onResult(GetCredentialResponse response) {
                            signingIn = false;
                            try {
                                Credential credential = response.getCredential();
                                if (!(credential instanceof CustomCredential)
                                    || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                                    call.reject("Google returned an unexpected credential.");
                                    return;
                                }
                                GoogleIdTokenCredential google = GoogleIdTokenCredential.createFrom(credential.getData());
                                JSObject result = new JSObject();
                                result.put("idToken", google.getIdToken());
                                call.resolve(result);
                            } catch (Exception error) {
                                call.reject("Unable to read Google sign-in response.");
                            }
                        }

                        @Override
                        public void onError(GetCredentialException error) {
                            signingIn = false;
                            if (error instanceof GetCredentialCancellationException) {
                                call.reject("Google sign-in canceled.", "CANCELED");
                            } else {
                                call.reject("Google sign-in failed. Check that Google Play services are updated and try again.");
                            }
                        }
                    }
                );
            } catch (Exception error) {
                signingIn = false;
                call.reject("Unable to start Google sign-in.");
            }
        });
    }
}
