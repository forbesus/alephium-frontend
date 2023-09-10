/*
Copyright 2018 - 2022 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

import { isAddressValid } from '@alephium/sdk'
import { useFocusEffect } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import * as Clipboard from 'expo-clipboard'
import { usePostHog } from 'posthog-react-native'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Portal } from 'react-native-portalize'
import { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import Toast from 'react-native-root-toast'
import styled, { useTheme } from 'styled-components/native'

import Button from '~/components/buttons/Button'
import Input from '~/components/inputs/Input'
import BottomModal from '~/components/layout/BottomModal'
import { ScreenProps, ScreenSection } from '~/components/layout/Screen'
import ScrollScreen from '~/components/layout/ScrollScreen'
import QRCodeScannerModal from '~/components/QRCodeScannerModal'
import { useSendContext } from '~/contexts/SendContext'
import { useAppDispatch, useAppSelector } from '~/hooks/redux'
import { PossibleNextScreenAfterDestination, SendNavigationParamList } from '~/navigation/SendNavigation'
import { CloseButton, ContinueButton } from '~/screens/SendReceive/ProgressHeader'
import ScreenIntro from '~/screens/SendReceive/ScreenIntro'
import SelectAddressModal from '~/screens/SendReceive/Send/SelectAddressModal'
import SelectContactModal from '~/screens/SendReceive/Send/SelectContactModal'
import { selectAllContacts } from '~/store/addresses/addressesSelectors'
import { cameraToggled } from '~/store/appSlice'
import { AddressHash } from '~/types/addresses'
import { Contact } from '~/types/contacts'
import { validateIsAddressValid } from '~/utils/forms'

interface DestinationScreenProps extends StackScreenProps<SendNavigationParamList, 'DestinationScreen'>, ScreenProps {}

type FormData = {
  toAddressHash: AddressHash
}

const requiredErrorMessage = 'This field is required'

const DestinationScreen = ({ navigation, route: { params }, ...props }: DestinationScreenProps) => {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<FormData>({ defaultValues: { toAddressHash: '' } })
  const theme = useTheme()
  const { setToAddress, setFromAddress, toAddress } = useSendContext()
  const posthog = usePostHog()
  const isCameraOpen = useAppSelector((s) => s.app.isCameraOpen)
  const contacts = useAppSelector(selectAllContacts)
  const dispatch = useAppDispatch()
  const [contactSelectModalOpen, setContactSelectModalOpen] = useState(false)
  const [addressSelectModalOpen, setAddressSelectModalOpen] = useState(false)
  const shouldFlash = useSharedValue(0)

  const openQRCodeScannerModal = () => dispatch(cameraToggled(true))
  const closeQRCodeScannerModal = () => dispatch(cameraToggled(false))

  const [nextScreen, setNextScreen] = useState<PossibleNextScreenAfterDestination>('OriginScreen')

  const handlePastePress = async () => {
    const text = await Clipboard.getStringAsync()
    setValue('toAddressHash', text)

    posthog?.capture('Send: Pasted destination address')
  }

  const handleQRCodeScan = (addressHash: string) => {
    if (isAddressValid(addressHash)) {
      setValue('toAddressHash', addressHash)

      posthog?.capture('Send: Captured destination address by scanning QR code')
    } else {
      Toast.show('This is not a valid Alephium address.')
    }
  }

  const flashInputBg = () => {
    shouldFlash.value = 1
    setTimeout(() => (shouldFlash.value = 0), 300)
  }

  const handleContactPress = (contactId: Contact['id']) => {
    const contact = contacts.find((c) => c.id === contactId)

    if (contact) {
      setToAddress(contact.address)
      flashInputBg()
      setContactSelectModalOpen(false)

      posthog?.capture('Send: Selected contact to send funds to')
    }
  }

  const handleAddressPress = (addressHash: AddressHash) => {
    setToAddress(addressHash)
    flashInputBg()
    setAddressSelectModalOpen(false)

    posthog?.capture('Send: Selected own address to send funds to')
  }

  useEffect(() => {
    if (params?.fromAddressHash) {
      setFromAddress(params.fromAddressHash)
      setNextScreen('AssetsScreen')
    } else {
      setNextScreen('OriginScreen')
    }
  }, [params?.fromAddressHash, setFromAddress, setToAddress])

  useEffect(() => {
    if (toAddress) {
      setValue('toAddressHash', toAddress)
    }
  }, [setValue, toAddress])

  const inputStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(interpolateColor(shouldFlash.value, [0, 1], [theme.bg.highlight, theme.global.pale]), {
      duration: 300
    })
  }))

  useFocusEffect(
    useCallback(() => {
      const onContinue = (formData: FormData) => {
        setToAddress(formData.toAddressHash)
        navigation.navigate(nextScreen)
      }
      navigation.getParent()?.setOptions({
        headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
        headerRight: () => (
          <ContinueButton onPress={handleSubmit(onContinue)} disabled={!!errors.toAddressHash?.message} />
        )
      })
    }, [errors.toAddressHash?.message, handleSubmit, navigation, nextScreen, setToAddress])
  )

  return (
    <>
      <ScrollScreen hasHeader verticalGap {...props}>
        <ScreenIntro title="Destination" subtitle="Send to an address, a contact, or one of your other addresses." />
        <ScreenSection>
          <Controller
            name="toAddressHash"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Destination address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.toAddressHash?.type === 'required' ? requiredErrorMessage : errors.toAddressHash?.message}
                style={inputStyle}
              />
            )}
            rules={{
              required: true,
              validate: validateIsAddressValid
            }}
            control={control}
          />
        </ScreenSection>
        <ScreenSection>
          <ButtonsRow>
            <Button
              compact
              iconProps={{ name: 'qr-code-outline' }}
              title="Scan"
              onPress={openQRCodeScannerModal}
              variant="accent"
              type="secondary"
            />
            <Button
              compact
              iconProps={{ name: 'copy-outline' }}
              title="Paste"
              onPress={handlePastePress}
              variant="accent"
              type="secondary"
            />
            <Button
              compact
              iconProps={{ name: 'person-outline' }}
              title="Contacts"
              onPress={() => setContactSelectModalOpen(true)}
              variant="accent"
              type="secondary"
            />
            <Button
              compact
              iconProps={{ name: 'bookmarks-outline' }}
              title="Addresses"
              onPress={() => setAddressSelectModalOpen(true)}
              variant="accent"
              type="secondary"
            />
          </ButtonsRow>
        </ScreenSection>
        {isCameraOpen && (
          <QRCodeScannerModal
            onClose={closeQRCodeScannerModal}
            onQRCodeScan={handleQRCodeScan}
            text="Scan an Alephium address QR code"
          />
        )}
      </ScrollScreen>

      <Portal>
        <BottomModal
          isOpen={contactSelectModalOpen}
          Content={(props) => <SelectContactModal onContactPress={handleContactPress} {...props} />}
          onClose={() => setContactSelectModalOpen(false)}
          customMinHeight={300}
        ></BottomModal>

        <BottomModal
          isOpen={addressSelectModalOpen}
          Content={(props) => <SelectAddressModal onAddressPress={handleAddressPress} {...props} />}
          onClose={() => setAddressSelectModalOpen(false)}
          customMinHeight={300}
          scrollableContent
        ></BottomModal>
      </Portal>
    </>
  )
}

export default DestinationScreen

const ButtonsRow = styled.View`
  flex-direction: row;
  gap: 15px;
  flex-wrap: wrap;
`
