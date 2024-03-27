import React, { useState, useEffect } from "react";
import { Auth, API, graphqlOperation } from 'aws-amplify';
import { listNotes } from "./graphql/queries";
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from "./graphql/mutations";
import { Button, Flex, Heading, Text, TextField, Image, View, withAuthenticator } from "@aws-amplify/ui-react";

const App = ({ signOut }) => {
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(user => setUser(user))
      .catch(() => setUser(null));
    fetchNotes();
  }, []);

  async function fetchNotes() {
    try {
      const apiData = await API.graphql(graphqlOperation(listNotes));
      setNotes(apiData.data.listNotes.items);
    } catch (error) {
      console.error('Error fetching notes: ', error);
    }
  }

  async function createNote(event) {
    event.preventDefault();
    const { name, description, image } = event.target.elements;
    const currentUser = await Auth.currentAuthenticatedUser();
    const inputData = {
      name: name.value,
      description: description.value,
      image: image.files[0] ? image.files[0].name : null,
      userId: currentUser.attributes.sub // Sub is the unique identifier of the user
    };
    try {
      await API.graphql(graphqlOperation(createNoteMutation, { input: inputData }));
      if (inputData.image) {
        await Storage.put(inputData.image, image.files[0]);
      }
      fetchNotes();
      event.target.reset();
    } catch (error) {
      console.error('Error creating note: ', error);
    }
  }

  async function deleteNote({ id, image }) {
    try {
      await API.graphql(graphqlOperation(deleteNoteMutation, { input: { id } }));
      if (image) {
        await Storage.remove(image);
      }
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note: ', error);
    }
  }

  return (
    <View className="App">
      <Heading level={1} color="red">Social Media App</Heading>
      {user && (
        <View as="form" margin="3rem 0" onSubmit={createNote}>
          <Flex direction="row" justifyContent="center">
            <TextField
              name="name"
              placeholder="Note Name"
              label="Note Name"
              labelHidden
              variation="quiet"
              required
            />
            <TextField
              name="description"
              placeholder="Description"
              label="Description"
              labelHidden
              variation="quiet"
            />
            <input type="file" name="image" accept="image/*" />
            <Button type="submit" variation="primary">
              Create Note
            </Button>
          </Flex>
        </View>
      )}
      <View margin="3rem 0">
        {notes.map((note) => (
          <Flex key={note.id} direction="column" justifyContent="center" alignItems="center">
            <Text as="strong" fontWeight={700}>
              {note.name}
            </Text>
            <Text as="span">{note.description}</Text>
            {note.image && (
              <Image src={note.image} alt={`visual aid for ${note.name}`} style={{ width: 400 }} />
            )}
            {user && user.attributes.sub === note.userId && (
              <Button variation="link" onClick={() => deleteNote(note)}>
                Delete note
              </Button>
            )}
          </Flex>
        ))}
      </View>
      <Button onClick={signOut}>Sign Out</Button>
    </View>
  );
};

export default withAuthenticator(App);